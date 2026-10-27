"""Construye el corpus de validación a partir de una carpeta de imágenes de prueba.

Uso (desde backend/):
    python -m scripts.build_corpus <carpeta_de_entrada> [--out corpus] [--author "Nombre"]

Usa solo imágenes propias o con licencia libre. Cada imagen se normaliza a JPEG (calidad 95,
sin metadatos ni GPS), porque IPTC-IIM solo se lee de forma fiable en JPEG, y se guarda en
cuatro grupos:

    01_sin_metadatos  píxeles limpios, sin ningún metadato
    02_metadatos      autoría y copyright en EXIF, XMP e IPTC, sin exclusión de IA
    03_noai           lo mismo más las directivas noai (ai_opt_out=True)
    04_c2pa           píxeles limpios con un manifiesto C2PA firmado con el certificado de prueba

Los nombres de salida son anónimos (img001.jpg, ...). `sources.csv` relaciona cada id con el
archivo original y no se versiona, igual que el corpus.
"""
from __future__ import annotations

import argparse
import csv
import os
import sys
import tempfile
from datetime import date
from typing import List

from PIL import Image, ImageOps

from core.metadata_writer import write_metadata
from core.resistance_suite import encode
from scripts.c2pa_test_signer import load_credentials, sign_c2pa

INPUT_EXT = {".jpg", ".jpeg", ".png", ".webp", ".tif", ".tiff"}
GROUPS = ("01_sin_metadatos", "02_metadatos", "03_noai", "04_c2pa")
CERT_DIR = os.path.join(os.path.dirname(__file__), "certs")


def _iim(dataset: int, value: str) -> bytes:
    data = value.encode("utf-8")
    return bytes([0x1C, 2, dataset]) + len(data).to_bytes(2, "big") + data


def iptc_segment(author: str, rights: str) -> bytes:
    """Segmento APP13 (Photoshop 3.0, recurso 0x0404) con By-line y Copyright Notice en UTF-8."""
    data = (
        bytes([0x1C, 1, 90, 0, 3]) + b"\x1b%G"  # 1:90 juego de caracteres = UTF-8
        + bytes([0x1C, 2, 0, 0, 2, 0, 4])  # 2:00 versión del registro
        + _iim(80, author) + _iim(110, author) + _iim(116, rights)
    )
    padded = data + (b"\x00" if len(data) % 2 else b"")
    resource = b"8BIM" + (0x0404).to_bytes(2, "big") + b"\x00\x00" + len(data).to_bytes(4, "big") + padded
    payload = b"Photoshop 3.0\x00" + resource
    return b"\xff\xed" + (len(payload) + 2).to_bytes(2, "big") + payload


def add_iptc(jpeg: bytes, author: str, rights: str) -> bytes:
    if jpeg[:2] != b"\xff\xd8":
        raise ValueError("Se esperaba un JPEG.")
    return jpeg[:2] + iptc_segment(author, rights) + jpeg[2:]


def clean_jpeg(path: str) -> bytes:
    with Image.open(path) as img:
        img.load()
        img = ImageOps.exif_transpose(img)
        return encode(img, "JPEG", 95, None)


def _signed(clean: bytes, author: str, rights: str, ai_opt_out: bool) -> bytes:
    """Autoría en EXIF y XMP con metadata_writer, más IPTC."""
    with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:
        tmp.write(clean)
        path = tmp.name
    try:
        data, _ = write_metadata(path, author, rights, ai_opt_out, True)
    finally:
        os.remove(path)
    return add_iptc(data, author, rights)


def build(inputs: List[str], out: str, author: str) -> int:
    rights = f"© {date.today().year} {author}"
    chain, key = load_credentials(CERT_DIR)
    for g in GROUPS:
        os.makedirs(os.path.join(out, g), exist_ok=True)
    rows = []
    for i, src in enumerate(inputs, 1):
        name = f"img{i:03d}.jpg"
        try:
            clean = clean_jpeg(src)
        except OSError as e:
            print(f"Se omite {src}: no es una imagen válida ({e})", file=sys.stderr)
            continue
        files = {
            "01_sin_metadatos": clean,
            "02_metadatos": _signed(clean, author, rights, False),
            "03_noai": _signed(clean, author, rights, True),
            "04_c2pa": sign_c2pa(clean, "JPEG", chain, key, name),
        }
        for group, data in files.items():
            with open(os.path.join(out, group, name), "wb") as fh:
                fh.write(data)
        rows.append({"id": name, "source": os.path.basename(src)})
    with open(os.path.join(out, "sources.csv"), "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=["id", "source"])
        writer.writeheader()
        writer.writerows(rows)
    return len(rows)


def main() -> None:
    parser = argparse.ArgumentParser(description="Construye el corpus de validación en cuatro grupos.")
    parser.add_argument("input", help="Carpeta con imágenes propias o con licencia libre")
    parser.add_argument("--out", default="corpus", help="Carpeta de salida (por defecto: corpus)")
    parser.add_argument("--author", default="Autora de prueba", help="Autor que se escribe en los grupos 02 y 03")
    args = parser.parse_args()
    inputs = sorted(
        os.path.join(args.input, f) for f in os.listdir(args.input)
        if os.path.splitext(f)[1].lower() in INPUT_EXT
    )
    if not inputs:
        sys.exit(f"No hay imágenes en {args.input}.")
    n = build(inputs, args.out, args.author)
    print(f"Corpus listo en {args.out}: {n} imágenes por grupo, {n * len(GROUPS)} archivos.")


if __name__ == "__main__":
    main()
