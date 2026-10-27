"""Suite de resistencia: qué protecciones sobreviven a las transformaciones típicas de la web.

Para una imagen aplica compresión JPEG, remuestreo, recorte, cambio de formato y una
captura de pantalla simulada, y registra por transformación si sobreviven:

- Metadatos: EXIF, XMP e IPTC (leídos con `MetadataReader`).
- Credenciales C2PA: manifiesto presente y válido antes y después (`read_c2pa`).
- Señales noai: las mismas etiquetas de exclusión que tenía el original.
- Marca defensiva: la marca visible de `core.watermark`, que la suite aplica a una
  copia de los píxeles y busca después por correlación normalizada.

Las transformaciones conservan lo que Pillow puede copiar (EXIF, XMP y perfil ICC), es
decir, miden el mejor caso: lo que se pierde aun con una herramienta que no borra los
metadatos a propósito. Pillow no escribe IPTC-IIM ni el manifiesto C2PA, así que esos
nunca sobreviven a una recodificación. La captura de pantalla los descarta siempre.
"""
from __future__ import annotations

import io
import os
import shutil
import tempfile
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple

import numpy as np
from PIL import Image, ImageFilter, PngImagePlugin

from core.image_stressor import ImageStressor
from core.metadata_reader import XMP_PATTERN, MetadataReader
from core.watermark import draw_watermark, watermark_mask

SURVIVES = "sobrevive"
LOST = "no sobrevive"
NOT_APPLICABLE = "no aplica"

# Calidad con la que se guardan las transformaciones que no son de compresión, para que
# su efecto no se mezcle con el de una recompresión agresiva.
NEUTRAL_JPEG_QUALITY = 95
FORMAT_JPEG_QUALITY = 90
FORMAT_WEBP_QUALITY = 80  # WebP con pérdida, como lo sirven la mayoría de plataformas
EXT = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp"}

# Correlación normalizada mínima entre el detalle fino de la imagen y la máscara de la marca
# para considerarla detectable. Ver la sección "Detección de la marca defensiva" del README:
# en la calibración, las imágenes sin marca no pasaron de 0,003 y las marcadas al 35 % no
# bajaron de 0,17 (ruido blanco, el peor caso) en ninguna transformación.
WATERMARK_THRESHOLD = 0.10
WATERMARK_OPACITY = 35
HIGHPASS_RADIUS = 4

Geometry = Callable[[Image.Image], Image.Image]


@dataclass
class Transform:
    id: str
    label: str
    params: Dict[str, Any]
    geometry: Geometry  # cambia el tamaño o el encuadre; se aplica igual a la máscara
    fmt: Optional[str]  # formato de salida; None = el del original
    quality: int = NEUTRAL_JPEG_QUALITY
    keep_metadata: bool = True


def _identity(img: Image.Image) -> Image.Image:
    return img


def _fit(side: int) -> Geometry:
    def apply(img: Image.Image) -> Image.Image:
        ratio = side / max(img.size)
        size = (max(1, round(img.width * ratio)), max(1, round(img.height * ratio)))
        return img if size == img.size else img.resize(size, Image.LANCZOS)
    return apply


def _crop(pct: float) -> Geometry:
    def apply(img: Image.Image) -> Image.Image:
        dx, dy = round(img.width * pct / 100), round(img.height * pct / 100)
        return img.crop((dx, dy, img.width - dx, img.height - dy))
    return apply


def _fit_inside(width: int, height: int) -> Geometry:
    def apply(img: Image.Image) -> Image.Image:
        ratio = min(1.0, width / img.width, height / img.height)
        size = (max(1, round(img.width * ratio)), max(1, round(img.height * ratio)))
        return img if size == img.size else img.resize(size, Image.LANCZOS)
    return apply


def build_transforms(
    jpeg_qualities: Sequence[int] = (50, 75),
    resample_side: int = 1080,
    crop_pct: float = 5,
    screen: Tuple[int, int] = (1920, 1080),
) -> List[Transform]:
    out = [
        Transform(f"jpeg_q{q}", f"Compresión JPEG (calidad {q})", {"quality": q}, _identity, "JPEG", quality=q)
        for q in jpeg_qualities
    ]
    out.append(Transform(f"resample_{resample_side}", f"Remuestreo a {resample_side} px de lado mayor",
                         {"side": resample_side}, _fit(resample_side), None))
    out.append(Transform(f"crop_{crop_pct:g}", f"Recorte del {crop_pct:g} % de cada borde",
                         {"percent": crop_pct}, _crop(crop_pct), None))
    out.append(Transform("format_png", "Cambio de formato a PNG", {"format": "PNG"}, _identity, "PNG"))
    out.append(Transform("format_jpeg", "Cambio de formato a JPEG", {"format": "JPEG", "quality": FORMAT_JPEG_QUALITY},
                         _identity, "JPEG", quality=FORMAT_JPEG_QUALITY))
    out.append(Transform("format_webp", "Cambio de formato a WebP", {"format": "WEBP", "quality": FORMAT_WEBP_QUALITY},
                         _identity, "WEBP", quality=FORMAT_WEBP_QUALITY))
    # Aproximación de una captura de pantalla: la imagen se muestra reducida a la pantalla y se
    # guarda como PNG sin metadatos. No reproduce el escalado del sistema operativo, la gestión
    # de color, el suavizado subpíxel ni la interfaz que suele quedar alrededor.
    w, h = screen
    out.append(Transform("screenshot", f"Reducción a pantalla {w}×{h} y captura simulada",
                         {"screen": [w, h]}, _fit_inside(w, h), "PNG", keep_metadata=False))
    return out


# ---------- Codificación ----------
def _metadata(img: Image.Image, raw: bytes) -> Dict[str, Optional[bytes]]:
    exif = img.info.get("exif")
    if not exif:
        tags = img.getexif()
        exif = tags.tobytes() if len(tags) else None
    xmp = XMP_PATTERN.search(raw)
    return {"exif": exif, "xmp": xmp.group(0) if xmp else None, "icc": img.info.get("icc_profile")}


def _for_format(img: Image.Image, fmt: str) -> Image.Image:
    if fmt == "JPEG":
        return ImageStressor._flatten(img)
    if img.mode in ("RGB", "RGBA"):
        return img
    has_alpha = img.mode in ("LA", "PA") or "transparency" in img.info
    return img.convert("RGBA" if has_alpha else "RGB")


def encode(img: Image.Image, fmt: str, quality: int, meta: Optional[Dict[str, Optional[bytes]]]) -> bytes:
    img = _for_format(img, fmt)
    kw: Dict[str, Any] = {}
    meta = meta or {}
    if meta.get("exif"):
        kw["exif"] = meta["exif"]
    if meta.get("icc"):
        kw["icc_profile"] = meta["icc"]
    if fmt == "PNG":
        if meta.get("xmp"):
            info = PngImagePlugin.PngInfo()
            info.add_itxt("XML:com.adobe.xmp", meta["xmp"].decode("utf-8", errors="ignore"))
            kw["pnginfo"] = info
    else:
        kw["quality"] = quality
        if meta.get("xmp"):
            kw["xmp"] = meta["xmp"]
    buf = io.BytesIO()
    img.save(buf, fmt, **kw)
    return buf.getvalue()


def _decode(data: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(data))
    img.load()
    return img


# ---------- Detección de la marca ----------
def _detail(arr: np.ndarray) -> np.ndarray:
    """Detalle fino (paso alto): el valor menos su versión desenfocada."""
    # El desenfoque de Pillow no admite imágenes de coma flotante; los valores ya van de 0 a 255.
    img = Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))
    blurred = np.asarray(img.filter(ImageFilter.GaussianBlur(HIGHPASS_RADIUS)), dtype=np.float32)
    return arr - blurred


def watermark_correlation(img: Image.Image, mask: Image.Image) -> float:
    """Correlación de Pearson entre el detalle de la luminancia y el de la máscara.

    La máscara (`watermark_mask`) es la marca sobre gris: relleno claro y contorno oscuro.
    El paso alto quita las zonas amplias de la imagen, que no tienen relación con la marca.
    """
    lum = np.asarray(ImageStressor._flatten(img).convert("L"), dtype=np.float32)
    ref = np.asarray(mask, dtype=np.float32)
    if lum.shape != ref.shape:
        raise ValueError("La máscara y la imagen no tienen el mismo tamaño.")
    a, b = _detail(lum).ravel(), _detail(ref).ravel()
    a, b = a - a.mean(), b - b.mean()
    denom = float(np.sqrt((a * a).sum() * (b * b).sum()))
    return 0.0 if denom == 0 else float((a * b).sum() / denom)


# ---------- Indicadores ----------
def _sources(audit: Dict[str, Any]) -> Dict[str, bool]:
    by = audit["stats"]["by_source"]
    return {"exif": by.get("EXIF", 0) > 0, "xmp": by.get("XMP", 0) > 0, "iptc": by.get("IPTC", 0) > 0}


def _state(before: bool, after: bool) -> str:
    if not before:
        return NOT_APPLICABLE
    return SURVIVES if after else LOST


def _compare(base: Dict[str, Any], audit: Dict[str, Any]) -> Dict[str, Any]:
    before, after = _sources(base), _sources(audit)
    per = {k: _state(before[k], after[k]) for k in before}
    present = [v for v in per.values() if v != NOT_APPLICABLE]
    meta_state = NOT_APPLICABLE if not present else SURVIVES if all(v == SURVIVES for v in present) else LOST

    c_before, c_after = base["c2pa"], audit["c2pa"]
    c2pa_state = _state(bool(c_before.get("present")), bool(c_after.get("present") and c_after.get("valid")))

    tags_before, tags_after = set(base["exclusion_tags"]), set(audit["exclusion_tags"])
    noai_state = _state(bool(tags_before), bool(tags_before) and tags_before <= tags_after)

    return {
        "metadata": {"status": meta_state, **per},
        "c2pa": {
            "status": c2pa_state,
            "valid_before": bool(c_before.get("valid")),
            "present_after": bool(c_after.get("present")),
            "valid_after": bool(c_after.get("valid")),
        },
        "noai": {"status": noai_state, "tags": sorted(tags_after)},
    }


def run_suite(
    path: str,
    filename: str = "",
    transforms: Optional[List[Transform]] = None,
    watermark_text: Optional[str] = None,
    watermark_opacity: int = WATERMARK_OPACITY,
) -> Dict[str, Any]:
    """Ejecuta todas las transformaciones y devuelve una fila por cada una.

    Los archivos intermedios se escriben en una carpeta temporal propia que se borra
    siempre al terminar, también si algo falla.
    """
    transforms = transforms if transforms is not None else build_transforms()
    with open(path, "rb") as fh:
        raw = fh.read()
    with Image.open(path) as src:
        src.load()
        src_fmt = src.format
        meta = _metadata(src, raw)
        original = src.copy()
    base = MetadataReader(path, filename).analyze().to_dict()

    # La marca se aplica a una copia de los píxeles; la versión sin marca hace de control negativo.
    marked = clean = mask_img = None
    if watermark_text:
        clean = ImageStressor._flatten(original)
        marked = draw_watermark(clean, watermark_text, watermark_opacity)
        mask_img = watermark_mask(clean.size, watermark_text)

    work = tempfile.mkdtemp(prefix="escudo-suite-")
    rows: List[Dict[str, Any]] = []
    try:
        for t in transforms:
            fmt = t.fmt or (src_fmt if src_fmt in EXT else "PNG")
            data = encode(t.geometry(original), fmt, t.quality, meta if t.keep_metadata else None)
            out_path = os.path.join(work, t.id + EXT[fmt])
            with open(out_path, "wb") as fh:
                fh.write(data)
            audit = MetadataReader(out_path, os.path.basename(out_path)).analyze().to_dict()
            row: Dict[str, Any] = {
                "id": t.id,
                "label": t.label,
                "params": t.params,
                "output": {"format": fmt, "width": audit["dimensions"]["width"],
                           "height": audit["dimensions"]["height"], "bytes": len(data)},
                **_compare(base, audit),
            }

            if marked is not None:
                mask = t.geometry(mask_img)
                score = watermark_correlation(_decode(encode(t.geometry(marked), fmt, t.quality, None)), mask)
                control = watermark_correlation(_decode(encode(t.geometry(clean), fmt, t.quality, None)), mask)
                row["watermark"] = {"status": SURVIVES if score >= WATERMARK_THRESHOLD else LOST,
                                    "correlation": round(score, 4), "control": round(control, 4)}
            else:
                row["watermark"] = {"status": NOT_APPLICABLE, "correlation": None, "control": None}
            rows.append(row)
    finally:
        shutil.rmtree(work, ignore_errors=True)

    return {
        "filename": base["filename"],
        "format": base["format"],
        "dimensions": base["dimensions"],
        "baseline": {
            **_sources(base),
            "c2pa": {"present": bool(base["c2pa"].get("present")), "valid": bool(base["c2pa"].get("valid"))},
            "exclusion_tags": base["exclusion_tags"],
            "watermark": {"applied": marked is not None, "text": watermark_text or None,
                          "opacity": watermark_opacity if marked is not None else None},
        },
        "watermark_threshold": WATERMARK_THRESHOLD,
        "rows": rows,
    }
