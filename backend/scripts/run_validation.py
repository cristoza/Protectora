"""Audita el corpus y ejecuta la suite de resistencia sobre cada imagen.

Uso (desde backend/):
    python -m scripts.run_validation [--corpus corpus] [--out results] [--watermark-text "© Autor"]

Escribe:
    results/audit_corpus.csv     una fila por imagen: lo que detecta MetadataReader y si coincide
                                 con lo que se escribió en su grupo
    results/stress_results.csv   una fila por imagen y transformación, con los cuatro indicadores

Al final imprime la tasa de acierto de la auditoría por grupo y el rango de correlaciones de la
marca, para recalibrar `WATERMARK_THRESHOLD`.
"""
from __future__ import annotations

import argparse
import csv
import os
import sys
from typing import Any, Dict, List

from core.metadata_reader import MetadataReader
from core.resistance_suite import WATERMARK_THRESHOLD, run_suite
from scripts.build_corpus import GROUPS

# Lo que la auditoría debería encontrar en cada grupo, según cómo lo construye build_corpus.
EXPECTED: Dict[str, Dict[str, bool]] = {
    "01_sin_metadatos": {"author": False, "copyright": False, "exif": False, "xmp": False, "iptc": False, "noai": False, "c2pa_valid": False},
    "02_metadatos": {"author": True, "copyright": True, "exif": True, "xmp": True, "iptc": True, "noai": False, "c2pa_valid": False},
    "03_noai": {"author": True, "copyright": True, "exif": True, "xmp": True, "iptc": True, "noai": True, "c2pa_valid": False},
    "04_c2pa": {"author": False, "copyright": False, "exif": False, "xmp": False, "iptc": False, "noai": False, "c2pa_valid": True},
}

AUDIT_FIELDS = ["group", "file", "format", "width", "height", "author", "copyright", "gps", "exif", "xmp", "iptc",
                "noai", "exclusion_tags", "c2pa_present", "c2pa_valid", "vulnerability_score", "risk_level", "matches_expected"]
STRESS_FIELDS = ["group", "file", "transform", "output_format", "output_width", "output_height", "output_bytes",
                 "metadata", "exif", "xmp", "iptc", "c2pa", "c2pa_valid_before", "c2pa_valid_after", "noai",
                 "watermark", "watermark_correlation", "watermark_control"]


def audit_row(group: str, path: str) -> Dict[str, Any]:
    r = MetadataReader(path, os.path.basename(path)).analyze().to_dict()
    by = r["stats"]["by_source"]
    found = {
        "author": r["has_author"], "copyright": r["has_copyright"],
        "exif": by.get("EXIF", 0) > 0, "xmp": by.get("XMP", 0) > 0, "iptc": by.get("IPTC", 0) > 0,
        "noai": bool(r["exclusion_tags"]), "c2pa_valid": bool(r["c2pa"].get("valid")),
    }
    return {
        "group": group, "file": r["filename"], "format": r["format"],
        "width": r["dimensions"]["width"], "height": r["dimensions"]["height"],
        **found, "gps": r["has_gps"], "exclusion_tags": "|".join(r["exclusion_tags"]),
        "c2pa_present": bool(r["c2pa"].get("present")),
        "vulnerability_score": r["vulnerability_score"], "risk_level": r["risk_level"],
        "matches_expected": found == EXPECTED[group],
    }


def stress_rows(group: str, path: str, watermark_text: str) -> List[Dict[str, Any]]:
    result = run_suite(path, os.path.basename(path), watermark_text=watermark_text or None)
    out = []
    for row in result["rows"]:
        m, c, w = row["metadata"], row["c2pa"], row["watermark"]
        out.append({
            "group": group, "file": result["filename"], "transform": row["id"],
            "output_format": row["output"]["format"], "output_width": row["output"]["width"],
            "output_height": row["output"]["height"], "output_bytes": row["output"]["bytes"],
            "metadata": m["status"], "exif": m["exif"], "xmp": m["xmp"], "iptc": m["iptc"],
            "c2pa": c["status"], "c2pa_valid_before": c["valid_before"], "c2pa_valid_after": c["valid_after"],
            "noai": row["noai"]["status"], "watermark": w["status"],
            "watermark_correlation": w["correlation"], "watermark_control": w["control"],
        })
    return out


def _write(path: str, fields: List[str], rows: List[Dict[str, Any]]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.DictWriter(fh, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)


def validate(corpus: str, out: str, watermark_text: str) -> Dict[str, Any]:
    audits: List[Dict[str, Any]] = []
    stress: List[Dict[str, Any]] = []
    for group in GROUPS:
        folder = os.path.join(corpus, group)
        if not os.path.isdir(folder):
            continue
        for name in sorted(os.listdir(folder)):
            path = os.path.join(folder, name)
            if not os.path.isfile(path) or name.startswith("."):
                continue
            audits.append(audit_row(group, path))
            stress.extend(stress_rows(group, path, watermark_text))
    if not audits:
        raise SystemExit(f"No hay imágenes en {corpus}. Ejecuta antes scripts.build_corpus.")
    os.makedirs(out, exist_ok=True)
    _write(os.path.join(out, "audit_corpus.csv"), AUDIT_FIELDS, audits)
    _write(os.path.join(out, "stress_results.csv"), STRESS_FIELDS, stress)
    return {"audits": audits, "stress": stress}


def summary(audits: List[Dict[str, Any]], stress: List[Dict[str, Any]]) -> str:
    lines = ["Auditoría: imágenes que coinciden con lo esperado"]
    for group in GROUPS:
        rows = [a for a in audits if a["group"] == group]
        if rows:
            ok = sum(a["matches_expected"] for a in rows)
            lines.append(f"  {group}: {ok}/{len(rows)}")
    marks = [s["watermark_correlation"] for s in stress if s["watermark_correlation"] is not None]
    controls = [abs(s["watermark_control"]) for s in stress if s["watermark_control"] is not None]
    if marks:
        lines.append(f"Marca: correlación mínima {min(marks):.4f}, control máximo {max(controls):.4f}, umbral {WATERMARK_THRESHOLD}")
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Audita el corpus y ejecuta la suite de resistencia.")
    parser.add_argument("--corpus", default="corpus")
    parser.add_argument("--out", default="results")
    parser.add_argument("--watermark-text", default="© Escudo Visual", help="Vacío para no medir la marca")
    args = parser.parse_args()
    data = validate(args.corpus, args.out, args.watermark_text)
    print(summary(data["audits"], data["stress"]))
    print(f"CSV en {args.out}/audit_corpus.csv y {args.out}/stress_results.csv")
    if not all(a["matches_expected"] for a in data["audits"]):
        sys.exit(1)


if __name__ == "__main__":
    main()
