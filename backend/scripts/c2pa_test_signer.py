"""Firma C2PA con un certificado de prueba, para el corpus de validación y las pruebas.

Genera (o carga) una CA de prueba y un certificado de firma RSA-PSS (PS256) con los usos
que exige C2PA. Estos certificados no están en ninguna lista de confianza: un lector C2PA
puede marcarlos como no confiables. No sirven para firmar obras reales.

Cómo generarlos a mano con openssl: ver scripts/certs/README.md.
"""
from __future__ import annotations

import datetime
import io
import json
import os
from typing import Optional, Tuple

import c2pa
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID

FORMAT_MIME = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp"}


def _name(cn: str) -> x509.Name:
    return x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, cn),
                      x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Escudo Visual (prueba)")])


def generate_test_credentials() -> Tuple[bytes, bytes]:
    """Devuelve (cadena PEM hoja + CA, llave privada PEM de la hoja)."""
    now = datetime.datetime.now(datetime.timezone.utc)
    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    ca = (x509.CertificateBuilder().subject_name(_name("Escudo Visual CA de prueba")).issuer_name(_name("Escudo Visual CA de prueba"))
          .public_key(ca_key.public_key()).serial_number(x509.random_serial_number())
          .not_valid_before(now - datetime.timedelta(days=1)).not_valid_after(now + datetime.timedelta(days=365))
          .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
          .add_extension(x509.KeyUsage(False, False, False, False, False, True, True, False, False), critical=True)
          .sign(ca_key, hashes.SHA256()))
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    leaf = (x509.CertificateBuilder().subject_name(_name("Escudo Visual firmante de prueba")).issuer_name(ca.subject)
            .public_key(key.public_key()).serial_number(x509.random_serial_number())
            .not_valid_before(now - datetime.timedelta(days=1)).not_valid_after(now + datetime.timedelta(days=365))
            .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
            .add_extension(x509.KeyUsage(True, False, False, False, False, False, False, False, False), critical=True)
            .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.EMAIL_PROTECTION]), critical=False)
            .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_key.public_key()), critical=False)
            .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()), critical=False)
            .sign(ca_key, hashes.SHA256()))
    chain = leaf.public_bytes(serialization.Encoding.PEM) + ca.public_bytes(serialization.Encoding.PEM)
    pem_key = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption())
    return chain, pem_key


def load_credentials(cert_dir: str) -> Tuple[bytes, bytes]:
    """Lee chain.pem y signer.key de `cert_dir`; si no existen, los genera y los guarda ahí."""
    chain_path, key_path = os.path.join(cert_dir, "chain.pem"), os.path.join(cert_dir, "signer.key")
    if not (os.path.exists(chain_path) and os.path.exists(key_path)):
        os.makedirs(cert_dir, exist_ok=True)
        chain, key = generate_test_credentials()
        with open(chain_path, "wb") as fh:
            fh.write(chain)
        with open(key_path, "wb") as fh:
            fh.write(key)
    with open(chain_path, "rb") as fh, open(key_path, "rb") as kh:
        return fh.read(), kh.read()


class _Signer(c2pa.SignerCallback):
    def __init__(self, pem_key: bytes):
        self.key = serialization.load_pem_private_key(pem_key, password=None)

    def sign(self, data: bytes) -> bytes:
        return self.key.sign(data, padding.PSS(mgf=padding.MGF1(hashes.SHA256()), salt_length=32), hashes.SHA256())


class _Stream(c2pa.Stream):
    def __init__(self, fh):
        self.fh = fh

    def read_stream(self, length: int) -> bytes:
        return self.fh.read(length)

    def seek_stream(self, pos: int, mode) -> int:
        whence = {c2pa.SeekMode.START: 0, c2pa.SeekMode.CURRENT: 1, c2pa.SeekMode.END: 2}[mode]
        return self.fh.seek(pos, whence)

    def write_stream(self, data: bytes) -> int:
        return self.fh.write(data)

    def flush_stream(self) -> None:
        self.fh.flush()


def sign_c2pa(data: bytes, fmt: str, chain: bytes, pem_key: bytes, title: Optional[str] = None) -> bytes:
    """Devuelve `data` con un manifiesto C2PA incrustado y firmado."""
    manifest = {
        "claim_generator": "EscudoVisual/0.1 corpus-de-prueba",
        "title": title or "imagen",
        "assertions": [{"label": "c2pa.actions", "data": {"actions": [{"action": "c2pa.created"}]}}],
    }
    builder = c2pa.Builder()
    builder.with_json(json.dumps(manifest))
    signer = c2pa.CallbackSigner(_Signer(pem_key), c2pa.SigningAlg.PS256, chain, None)
    src, dst = io.BytesIO(data), io.BytesIO()
    builder.sign(signer, FORMAT_MIME[fmt], _Stream(src), _Stream(dst))
    return dst.getvalue()
