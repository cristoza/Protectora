"""Asistente de Publicación Segura: recomendaciones a partir del reporte de auditoría.

Las reglas viven en `publication_rules.json` para poder ajustarlas sin tocar código. Cada regla
se evalúa sobre el reporte de `MetadataReader.to_dict()` ampliado con dos datos que el reporte
no incluye: `lossy` (formato con pérdida) y `jpeg_quality` (calidad JPEG estimada).
"""
from __future__ import annotations

import json
import os
from typing import Any, Dict, List, Optional

from PIL import Image

RULES_PATH = os.path.join(os.path.dirname(__file__), "publication_rules.json")
SEVERITY_ORDER = {"alta": 0, "media": 1, "info": 2}

# Tabla de cuantización de luminancia de referencia del IJG (anexo K de JPEG), en orden natural.
_IJG_LUMA = [
    16, 11, 10, 16, 24, 40, 51, 61, 12, 12, 14, 19, 26, 58, 60, 55,
    14, 13, 16, 24, 40, 57, 69, 56, 14, 17, 22, 29, 51, 87, 80, 62,
    18, 22, 37, 56, 68, 109, 103, 77, 24, 35, 55, 64, 81, 104, 113, 92,
    49, 64, 78, 87, 103, 121, 120, 101, 72, 92, 95, 98, 112, 100, 103, 99,
]


def load_rules(path: str = RULES_PATH) -> List[Dict[str, Any]]:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)["rules"]


def estimate_jpeg_quality(img: Image.Image) -> Optional[int]:
    """Calidad aproximada (1 a 100) invirtiendo la escala del IJG sobre la tabla de luminancia.

    Es exacta para archivos guardados con libjpeg (Pillow, la mayoría de editores); con tablas
    propias de otros programas da una aproximación.
    """
    tables = getattr(img, "quantization", None)
    if img.format != "JPEG" or not tables or 0 not in tables or len(tables[0]) != 64:
        return None
    scale = sum(q * 100 / ref for q, ref in zip(tables[0], _IJG_LUMA)) / 64
    quality = (200 - scale) / 2 if scale <= 100 else 5000 / scale
    return max(1, min(100, round(quality)))


def is_lossy(img: Image.Image, raw: bytes) -> bool:
    if img.format == "JPEG":
        return True
    if img.format == "WEBP":
        return b"VP8L" not in raw[12:40]  # VP8L = WebP sin pérdida
    return False


def _get(ctx: Dict[str, Any], path: str) -> Any:
    value: Any = ctx
    for part in path.split("."):
        if not isinstance(value, dict):
            return None
        value = value.get(part)
    return value


def _holds(cond: Dict[str, Any], ctx: Dict[str, Any]) -> bool:
    value, op, expected = _get(ctx, cond["field"]), cond["op"], cond.get("value")
    if op == "eq":
        return value == expected
    if op == "ne":
        return value != expected
    if op == "in":
        return value in expected
    if op == "empty":
        return not value
    if op == "not_empty":
        return bool(value)
    if value is None:
        return False
    if op == "gte":
        return value >= expected
    if op == "lte":
        return value <= expected
    raise ValueError(f"Operador desconocido en las reglas de publicación: {op}")


def advise(audit: Dict[str, Any], jpeg_quality: Optional[int], lossy: bool,
           rules: Optional[List[Dict[str, Any]]] = None) -> List[Dict[str, Any]]:
    """Recomendaciones que aplican, de más a menos importantes."""
    ctx = {**audit, "jpeg_quality": jpeg_quality, "lossy": lossy}
    out = []
    for rule in rules if rules is not None else load_rules():
        when = rule["when"]
        if when == "always" or all(_holds(c, ctx) for c in when):
            out.append({k: rule[k] for k in ("id", "severity", "title", "detail", "action") if k in rule})
    return sorted(out, key=lambda r: SEVERITY_ORDER.get(r["severity"], 3))
