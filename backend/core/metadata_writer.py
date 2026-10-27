"""Escritura de autoría, copyright y señales de exclusión de IA en los metadatos de una imagen.

Escribe EXIF (Artist, Copyright) y un paquete XMP nuevo (dc:creator, dc:rights, xmpRights,
palabras clave noai/noimageai, plus:DataMining de IPTC y tdm:reservation de W3C TDMRep).
Los píxeles no se tocan: en JPEG se reescriben solo los segmentos APP1 sin recomprimir, y
PNG, TIFF y WebP se guardan sin pérdida. El XMP anterior se reemplaza por el nuevo.
"""
from __future__ import annotations

import io
from datetime import date
from typing import Dict, Optional, Tuple
from xml.sax.saxutils import escape

import piexif
from PIL import Image, PngImagePlugin

MIME = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp", "TIFF": "image/tiff"}
EXT = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp", "TIFF": ".tif"}

XMP_HEADER = b"http://ns.adobe.com/xap/1.0/\x00"
XMP_EXT_HEADER = b"http://ns.adobe.com/xmp/extension/\x00"
EXIF_HEADER = b"Exif\x00\x00"
APP1_MAX = 65533  # longitud máxima de la carga de un segmento JPEG

# Vocabulario PLUS que usa el campo "Data Mining" de IPTC Photo Metadata 2023.1.
DATA_MINING_PROHIBITED = "http://ns.useplus.org/ldf/vocab/DMI-PROHIBITED-AIMLTRAINING"
USAGE_TERMS = "No se autoriza el uso de esta imagen para entrenar modelos de inteligencia artificial ni para minería de datos."


def default_copyright(author: str) -> str:
    return f"© {date.today().year} {author}"


def build_xmp(author: str, rights: str, ai_opt_out: bool) -> bytes:
    a, r = escape(author), escape(rights)
    attrs = ['xmpRights:Marked="True"', f'photoshop:Credit="{escape(author, {chr(34): "&quot;"})}"']
    extra = ""
    if ai_opt_out:
        attrs += [f'plus:DataMining="{DATA_MINING_PROHIBITED}"', 'tdm:reservation="1"']
        extra = (
            "   <dc:subject><rdf:Bag><rdf:li>noai</rdf:li><rdf:li>noimageai</rdf:li></rdf:Bag></dc:subject>\n"
            f'   <xmpRights:UsageTerms><rdf:Alt><rdf:li xml:lang="x-default">{escape(USAGE_TERMS)}</rdf:li></rdf:Alt></xmpRights:UsageTerms>\n'
        )
    packet = (
        '<?xpacket begin="﻿" id="W5M0MpCehiHzreSzNTczkc9d"?>\n'
        '<x:xmpmeta xmlns:x="adobe:ns:meta/">\n'
        ' <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">\n'
        '  <rdf:Description rdf:about=""\n'
        '    xmlns:dc="http://purl.org/dc/elements/1.1/"\n'
        '    xmlns:photoshop="http://ns.adobe.com/photoshop/1.0/"\n'
        '    xmlns:xmpRights="http://ns.adobe.com/xap/1.0/rights/"\n'
        '    xmlns:plus="http://ns.useplus.org/ldf/xmp/1.0/"\n'
        '    xmlns:tdm="http://www.w3.org/ns/tdmrep/"\n'
        f'    {" ".join(attrs)}>\n'
        f"   <dc:creator><rdf:Seq><rdf:li>{a}</rdf:li></rdf:Seq></dc:creator>\n"
        f'   <dc:rights><rdf:Alt><rdf:li xml:lang="x-default">{r}</rdf:li></rdf:Alt></dc:rights>\n'
        f"{extra}"
        "  </rdf:Description>\n"
        " </rdf:RDF>\n"
        "</x:xmpmeta>\n"
        '<?xpacket end="w"?>'
    )
    return packet.encode("utf-8")


def _exif_bytes(source: Optional[bytes], author: str, rights: str, strip_gps: bool) -> bytes:
    """EXIF existente con Artist y Copyright nuevos. Si el original no se puede reescribir, se parte de cero."""
    try:
        data = piexif.load(source) if source else None
    except Exception:
        data = None
    data = data or {"0th": {}, "Exif": {}, "GPS": {}, "Interop": {}, "1st": {}, "thumbnail": None}
    data["0th"][piexif.ImageIFD.Artist] = author.encode("utf-8")
    data["0th"][piexif.ImageIFD.Copyright] = rights.encode("utf-8")
    if strip_gps:
        data["GPS"] = {}
        data["0th"].pop(piexif.ImageIFD.GPSTag, None)

    attempts = (
        lambda d: d,
        lambda d: {**d, "1st": {}, "thumbnail": None},  # miniatura demasiado grande o dañada
        lambda d: {"0th": d["0th"], "Exif": {}, "GPS": d["GPS"], "Interop": {}, "1st": {}, "thumbnail": None},
        lambda d: {"0th": {k: v for k, v in d["0th"].items() if k in (piexif.ImageIFD.Artist, piexif.ImageIFD.Copyright, piexif.ImageIFD.Orientation)}},
    )
    for shape in attempts:
        try:
            out = piexif.dump(shape(data))
        except Exception:
            continue
        if len(out) <= APP1_MAX:
            return out
    raise ValueError("No se pudieron escribir los metadatos EXIF de esta imagen.")


def _app1(payload: bytes) -> bytes:
    return b"\xff\xe1" + (len(payload) + 2).to_bytes(2, "big") + payload


def _write_jpeg(raw: bytes, exif: bytes, xmp: bytes) -> bytes:
    """Sustituye los APP1 de EXIF y XMP sin decodificar la imagen: los píxeles quedan idénticos."""
    if raw[:2] != b"\xff\xd8":
        raise ValueError("El archivo JPEG está dañado.")
    if len(XMP_HEADER) + len(xmp) > APP1_MAX:
        raise ValueError("El bloque XMP es demasiado grande.")
    i, kept = 2, []
    while i + 4 <= len(raw) and raw[i] == 0xFF:
        marker = raw[i + 1]
        if marker == 0xDA:  # inicio de los datos comprimidos
            break
        length = int.from_bytes(raw[i + 2:i + 4], "big")
        seg = raw[i:i + 2 + length]
        payload = seg[4:]
        is_meta = marker == 0xE1 and payload.startswith((EXIF_HEADER, XMP_HEADER, XMP_EXT_HEADER))
        if not is_meta:
            kept.append(seg)
        i += 2 + length
    head = kept[:1] if kept and kept[0][1] == 0xE0 else []  # APP0 (JFIF) debe ir primero
    new = [_app1(exif), _app1(XMP_HEADER + xmp)]
    return b"\xff\xd8" + b"".join(head + new + kept[len(head):]) + raw[i:]


def write_metadata(path: str, author: str, rights: str, ai_opt_out: bool, strip_gps: bool) -> Tuple[bytes, str]:
    """Devuelve (bytes del archivo nuevo, formato de Pillow)."""
    with open(path, "rb") as fh:
        raw = fh.read()
    xmp = build_xmp(author, rights, ai_opt_out)

    with Image.open(path) as img:
        fmt = img.format
        if fmt not in MIME:
            raise ValueError("Formato no soportado para escribir metadatos.")
        if getattr(img, "n_frames", 1) > 1:
            raise ValueError("Las imágenes animadas o con varias páginas no se pueden firmar aquí.")

        if fmt == "JPEG":
            return _write_jpeg(raw, _exif_bytes(raw, author, rights, strip_gps), xmp), fmt

        img.load()
        exif = _exif_bytes(img.info.get("exif"), author, rights, strip_gps)
        icc = img.info.get("icc_profile")
        out = io.BytesIO()
        if fmt == "PNG":
            info = PngImagePlugin.PngInfo()
            for k, v in img.info.items():
                if isinstance(v, str) and k not in ("XML:com.adobe.xmp", "xmp"):
                    info.add_text(k, v)
            info.add_itxt("XML:com.adobe.xmp", xmp.decode("utf-8"))
            img.save(out, "PNG", pnginfo=info, exif=exif, icc_profile=icc, dpi=img.info.get("dpi"))
        elif fmt == "WEBP":
            # Sin pérdida: volver a comprimir con pérdida degradaría una posible perturbación.
            img.save(out, "WEBP", lossless=True, exact=True, exif=exif, xmp=xmp, icc_profile=icc)
        else:  # TIFF
            tags: Dict[int, object] = {700: xmp}
            for tag in (270, 271, 272, 274, 305, 306):  # descripción, cámara, orientación, software, fecha
                if tag in img.tag_v2:
                    tags[tag] = img.tag_v2[tag]
            # Los campos ASCII de TIFF admiten bytes: se guardan en UTF-8 para no perder los acentos.
            tags[315] = author.encode("utf-8")
            tags[33432] = rights.encode("utf-8")
            img.save(out, "TIFF", tiffinfo=tags, icc_profile=icc, compression=img.info.get("compression", "tiff_lzw"))
        return out.getvalue(), fmt
