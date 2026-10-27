"""Extracción de metadatos (EXIF, XMP, IPTC) y cálculo del score de vulnerabilidad."""
from __future__ import annotations

import html
import json
import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import piexif
from PIL import ExifTags, Image, IptcImagePlugin

try:
    import c2pa
except Exception:  # librería ausente o incompatible: la auditoría sigue sin C2PA
    c2pa = None

C2PA_MIME = {"JPEG": "image/jpeg", "PNG": "image/png", "WEBP": "image/webp", "TIFF": "image/tiff"}
AI_SOURCE_TYPES = ("trainedalgorithmicmedia", "compositewithtrainedalgorithmicmedia", "algorithmicmedia")

# Directivas de exclusión de entrenamiento de IA conocidas. Incluye la propiedad tdm:reservation
# de W3C TDMRep y los valores DMI-PROHIBITED-* del campo "Data Mining" de IPTC (vocabulario PLUS).
EXCLUSION_PATTERN = re.compile(
    r"noai|noimageai|do[\s_-]?not[\s_-]?train|tdm[:-]reservation|dataminingprohibited|dmi-prohibited[a-z-]*",
    re.IGNORECASE,
)
XMP_PATTERN = re.compile(rb"<x:xmpmeta.*?</x:xmpmeta>", re.DOTALL)

# IPTC-IIM (registro 2) -> nombre legible
IPTC_TAGS = {
    (2, 5): "Título",
    (2, 25): "Palabras clave",
    (2, 80): "Autor (By-line)",
    (2, 90): "Ciudad",
    (2, 101): "País",
    (2, 105): "Titular",
    (2, 110): "Crédito",
    (2, 115): "Fuente",
    (2, 116): "Aviso de copyright",
    (2, 120): "Descripción",
}

AUTHOR_HINTS = ("artist", "author", "creator", "by-line", "autor", "credit", "crédito")
COPYRIGHT_HINTS = ("copyright", "rights", "usageterms", "licen")

# Penalizaciones del score (100 = totalmente expuesta, 0 = bien protegida)
PENALTY_AUTHOR = 25
PENALTY_COPYRIGHT = 25
PENALTY_EXCLUSION = 40
PENALTY_EXTRA_RIGHTS = 10  # XMP/IPTC con información de derechos adicional


@dataclass
class Finding:
    source: str  # EXIF | XMP | IPTC | PNG
    key: str
    value: str
    category: str = "info"  # author | copyright | exclusion | privacy | info

    def to_dict(self) -> Dict[str, str]:
        return {"source": self.source, "key": self.key, "value": self.value, "category": self.category}


@dataclass
class AuditResult:
    filename: str
    format: Optional[str]
    width: int
    height: int
    findings: List[Finding] = field(default_factory=list)
    exclusion_tags: List[str] = field(default_factory=list)
    has_author: bool = False
    has_copyright: bool = False
    has_gps: bool = False
    vulnerability_score: int = 100
    risk_level: str = "alto"
    score_breakdown: List[Dict[str, Any]] = field(default_factory=list)
    c2pa: Dict[str, Any] = field(default_factory=lambda: {"present": False})

    def to_dict(self) -> Dict[str, Any]:
        counts: Dict[str, int] = {}
        for f in self.findings:
            counts[f.source] = counts.get(f.source, 0) + 1
        return {
            "filename": self.filename,
            "format": self.format,
            "dimensions": {"width": self.width, "height": self.height},
            "vulnerability_score": self.vulnerability_score,
            "risk_level": self.risk_level,
            "score_breakdown": self.score_breakdown,
            "has_author": self.has_author,
            "has_copyright": self.has_copyright,
            "has_gps": self.has_gps,
            "exclusion_tags": self.exclusion_tags,
            "c2pa": self.c2pa,
            "stats": {"total_fields": len(self.findings), "by_source": counts},
            "findings": [f.to_dict() for f in self.findings],
        }


def _clean(value: Any, limit: int = 300) -> str:
    if isinstance(value, bytes):
        value = value.decode("utf-8", errors="replace")
    text = str(value).replace("\x00", "").strip()
    return text if len(text) <= limit else text[:limit] + "…"


def _categorize(key: str, value: str) -> str:
    k = key.lower()
    if EXCLUSION_PATTERN.search(value) or EXCLUSION_PATTERN.search(k):
        return "exclusion"
    if any(h in k for h in COPYRIGHT_HINTS):
        return "copyright"
    if any(h in k for h in AUTHOR_HINTS):
        return "author"
    if k.startswith("gps"):
        return "privacy"
    return "info"


class MetadataReader:
    """Lee metadatos de una imagen en disco y calcula el score de vulnerabilidad."""

    def __init__(self, path: str, filename: str = ""):
        self.path = path
        self.filename = filename or path

    # ---------- API pública ----------
    def analyze(self) -> AuditResult:
        with open(self.path, "rb") as fh:
            raw = fh.read()

        with Image.open(self.path) as img:
            img.load()
            result = AuditResult(
                filename=self.filename, format=img.format, width=img.width, height=img.height
            )
            findings: List[Finding] = []
            findings += self._read_exif(raw, img)
            findings += self._read_xmp(raw, img)
            findings += self._read_iptc(img)
            findings += self._read_text_chunks(img)

        result.findings = findings
        result.exclusion_tags = self.find_exclusion_tags(raw, findings)
        result.has_author = any(f.category == "author" and f.value for f in findings)
        result.has_copyright = any(f.category == "copyright" and f.value for f in findings)
        result.has_gps = any(f.category == "privacy" for f in findings)
        result.c2pa = read_c2pa(self.path, result.format)
        self._score(result)
        return result

    @staticmethod
    def find_exclusion_tags(raw: bytes, findings: List[Finding]) -> List[str]:
        """Busca 'noai', 'noimageai' y similares en metadatos extraídos y en el XMP crudo."""
        found: List[str] = []
        haystacks = [f"{f.key} {f.value}" for f in findings]
        for m in XMP_PATTERN.finditer(raw):
            haystacks.append(m.group(0).decode("utf-8", errors="ignore"))
        for text in haystacks:
            for m in EXCLUSION_PATTERN.finditer(text):
                tag = m.group(0).lower().replace("tdm:", "tdm-")
                if tag not in found:
                    found.append(tag)
        return found

    # ---------- Lectores ----------
    def _read_exif(self, raw: bytes, img: Image.Image) -> List[Finding]:
        out: List[Finding] = []
        try:
            data = piexif.load(raw)
            for ifd_name in ("0th", "Exif", "GPS", "1st"):
                for tag, val in (data.get(ifd_name) or {}).items():
                    info = piexif.TAGS.get(ifd_name, {}).get(tag)
                    if not info:
                        continue
                    name = info["name"]
                    if name in ("MakerNote", "UserComment") and isinstance(val, bytes):
                        val = val[8:] if name == "UserComment" else val[:0]
                        if not val:
                            continue
                    if isinstance(val, bytes) and name.startswith("GPS") is False and len(val) > 64 and not _printable(val):
                        continue  # binario opaco (miniaturas, etc.)
                    key = f"GPS {name[3:]}" if ifd_name == "GPS" else name
                    if ifd_name == "GPS":
                        key = "GPS" + name[3:]
                    value = _clean(val)
                    if value:
                        out.append(Finding("EXIF", key, value, _categorize(key, value)))
            if out:
                return out
        except Exception:
            pass  # PNG u otros formatos: se usa el fallback de Pillow

        try:
            for tag_id, val in img.getexif().items():
                name = ExifTags.TAGS.get(tag_id, str(tag_id))
                if isinstance(val, str):
                    # Pillow decodifica el texto EXIF como latin-1; casi siempre es UTF-8.
                    try:
                        val = val.encode("latin-1").decode("utf-8")
                    except (UnicodeEncodeError, UnicodeDecodeError):
                        pass
                value = _clean(val)
                if value:
                    out.append(Finding("EXIF", name, value, _categorize(name, value)))
        except Exception:
            pass
        return out

    def _read_xmp(self, raw: bytes, img: Image.Image) -> List[Finding]:
        packets: List[str] = []
        for m in XMP_PATTERN.finditer(raw):
            packets.append(m.group(0).decode("utf-8", errors="ignore"))
        if not packets:
            for key in ("XML:com.adobe.xmp", "xmp"):
                v = img.info.get(key)
                if v:
                    packets.append(_clean(v, 100000))
        out: List[Finding] = []
        seen = set()
        for packet in packets:
            # Atributos rdf:Description  (prefijo:nombre="valor")
            for k, v in re.findall(r'\b([A-Za-z]+:[A-Za-z]+)="([^"]*)"', packet):
                if k.startswith(("xmlns", "rdf:", "x:")) or not v.strip():
                    continue
                v = html.unescape(v)
                if (k, v) not in seen:
                    seen.add((k, v))
                    out.append(Finding("XMP", k, _clean(v), _categorize(k, v)))
            # Elementos con texto (<dc:creator><rdf:li>…</rdf:li>)
            for tag, body in re.findall(r"<([A-Za-z]+:[A-Za-z]+)[^>]*>(.*?)</\1>", packet, re.DOTALL):
                if tag.startswith(("rdf:", "x:")):
                    continue
                items = re.findall(r"<rdf:li[^>]*>(.*?)</rdf:li>", body, re.DOTALL)
                text = ", ".join(i.strip() for i in items) if items else re.sub(r"<[^>]+>", "", body).strip()
                text = html.unescape(text)
                if text and (tag, text) not in seen:
                    seen.add((tag, text))
                    out.append(Finding("XMP", tag, _clean(text), _categorize(tag, text)))
        return out

    def _read_iptc(self, img: Image.Image) -> List[Finding]:
        out: List[Finding] = []
        try:
            info = IptcImagePlugin.getiptcinfo(img) or {}
        except Exception:
            return out
        for tag, val in info.items():
            name = IPTC_TAGS.get(tag, f"IPTC {tag[0]}:{tag[1]}")
            vals = val if isinstance(val, list) else [val]
            value = ", ".join(_clean(v) for v in vals)
            if value:
                out.append(Finding("IPTC", name, value, _categorize(name, value)))
        return out

    def _read_text_chunks(self, img: Image.Image) -> List[Finding]:
        """Chunks tEXt/iTXt de PNG y comentarios de JPEG/GIF (donde a veces se escribe 'noai')."""
        out: List[Finding] = []
        skip = {"XML:com.adobe.xmp", "xmp", "exif", "icc_profile", "photoshop", "dpi", "jfif",
                "jfif_version", "jfif_unit", "jfif_density", "progressive", "progression", "adobe",
                "adobe_transform", "gamma", "transparency", "interlace", "srgb", "aspect"}
        for key, val in img.info.items():
            if key in skip or not isinstance(val, (str, bytes)):
                continue
            value = _clean(val)
            if value:
                out.append(Finding("PNG/Texto", str(key), value, _categorize(str(key), value)))
        return out

    # ---------- Score ----------
    @staticmethod
    def _score(r: AuditResult) -> None:
        """100 = imagen sin ninguna señal de autoría/protección (máxima vulnerabilidad)."""
        score = 100
        bd: List[Dict[str, Any]] = []

        def sub(points: int, reason: str) -> None:
            nonlocal score
            score -= points
            bd.append({"points": -points, "reason": reason})

        if r.has_author:
            sub(PENALTY_AUTHOR, "Se encontró información de autoría")
        if r.has_copyright:
            sub(PENALTY_COPYRIGHT, "Se encontró aviso de copyright")
        if r.exclusion_tags:
            sub(PENALTY_EXCLUSION, "Se encontraron etiquetas de exclusión de IA (" + ", ".join(r.exclusion_tags) + ")")
        if r.has_author and r.has_copyright and any(f.source in ("XMP", "IPTC") for f in r.findings if f.category in ("author", "copyright")):
            sub(PENALTY_EXTRA_RIGHTS, "Los derechos están declarados también en XMP/IPTC, no solo en EXIF")
        if not bd:
            bd.append({"points": 0, "reason": "No se detectó ninguna señal de autoría, copyright ni exclusión"})
        r.vulnerability_score = max(0, min(100, score))
        s = r.vulnerability_score
        r.risk_level = "alto" if s >= 70 else "medio" if s >= 35 else "bajo"
        r.score_breakdown = bd


class _FileStream:
    """Adaptador de un archivo binario al protocolo Stream de c2pa-python."""

    def __init__(self, fh):
        self.fh = fh

    def read_stream(self, length: int):
        return self.fh.read(length)

    def seek_stream(self, pos: int, mode):
        whence = {c2pa.SeekMode.START: 0, c2pa.SeekMode.CURRENT: 1, c2pa.SeekMode.END: 2}[mode]
        return self.fh.seek(pos, whence)

    def write_stream(self, data: bytes):
        return self.fh.write(data)


def read_c2pa(path: str, fmt: Optional[str]) -> Dict[str, Any]:
    """Busca un manifiesto C2PA (Content Credentials) y valida su firma e integridad.

    Devuelve siempre un dict con `present` y `valid`. `valid` es True solo si el manifiesto
    se leyó y la librería no reportó errores de validación.
    """
    out: Dict[str, Any] = {"present": False, "valid": False, "issuer": None, "generator": None,
                           "signed_at": None, "ai_generated": False, "errors": []}
    mime = C2PA_MIME.get((fmt or "").upper())
    if c2pa is None or mime is None:
        return out
    try:
        with open(path, "rb") as fh:
            raw = c2pa.Reader().from_stream(mime, _FileStream(fh))
    except Exception as e:
        # Sin manifiesto es el caso normal; otros errores (firma rota, JUMBF corrupto) sí cuentan como presencia.
        name = type(e).__name__
        if name != "ManifestNotFound":
            out["present"] = True
            out["errors"].append(_clean(e, 200))
        return out

    try:
        data = json.loads(raw)
    except ValueError:
        out.update(present=True, errors=["No se pudo interpretar el manifiesto."])
        return out

    manifest = (data.get("manifests") or {}).get(data.get("active_manifest"), {})
    sig = manifest.get("signature_info") or {}
    out["present"] = True
    out["issuer"] = sig.get("issuer")
    out["signed_at"] = sig.get("time")
    out["generator"] = (manifest.get("claim_generator") or "").split(" ")[0] or None
    out["errors"] = [_clean(v.get("explanation") or v.get("code"), 200) for v in data.get("validation_status") or []]
    out["valid"] = not out["errors"]
    for a in manifest.get("assertions") or []:
        if str(a.get("label", "")).startswith("c2pa.actions"):
            for act in (a.get("data") or {}).get("actions", []):
                if any(t in str(act.get("digitalSourceType", "")).lower() for t in AI_SOURCE_TYPES):
                    out["ai_generated"] = True
    return out


def _printable(b: bytes) -> bool:
    try:
        t = b.decode("utf-8")
    except UnicodeDecodeError:
        return False
    return all(c.isprintable() or c in "\r\n\t\x00" for c in t)
