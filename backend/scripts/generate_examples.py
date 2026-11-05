"""Genera, una sola vez y offline, los ejemplos precalculados del Módulo 1.

Uso (desde backend/):
    python -m scripts.generate_examples [--out ../frontend/public/examples]

La imagen base es una ilustración sintética dibujada aquí mismo con Pillow (paisaje de
montañas), así que no tiene autoría de terceros ni problemas de licencia. Se escriben:

    original.png, original_model.jpg
    cloak.png, cloak_model.jpg, cloak_diff.jpg          perturbación (ImageProtector.cloak)
    watermark.png, watermark_model.jpg, watermark_diff.jpg
    stressed.jpg                                        la versión con cloak tras JPEG 60 al 50 %
    manifest.json                                       métricas con la forma de /api/protect

Necesita PyTorch y el VAE de Stable Diffusion (se descarga la primera vez). La interfaz solo
lee estos archivos: no ejecuta ningún modelo.
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import tempfile

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

from core.image_stressor import ImageStressor

WIDTH, HEIGHT = 1200, 800
STRENGTH = "media"
MARK_TEXT = "© Escudo Visual"
MARK_OPACITY = 35
STRESS = {"quality": 60, "scale": 0.5, "passes": 1}
DEFAULT_OUT = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "public", "examples")


def illustration() -> Image.Image:
    """Atardecer con montañas por capas, sol y algo de textura: detalle fino y zonas lisas."""
    rs = np.random.RandomState(2026)
    y = np.linspace(0, 1, HEIGHT)[:, None]
    top, bottom = np.array([38, 52, 140]), np.array([250, 170, 120])
    sky = (top + (bottom - top) * y[..., None]) * np.ones((1, WIDTH, 1))
    img = Image.fromarray(sky.astype(np.uint8))
    draw = ImageDraw.Draw(img)
    draw.ellipse((780, 250, 940, 410), fill=(255, 226, 150))
    layers = [((92, 70, 130), 0.45, 90), ((64, 52, 105), 0.58, 70), ((40, 36, 76), 0.72, 55), ((24, 26, 48), 0.85, 40)]
    for color, base, amp in layers:
        xs = np.arange(0, WIDTH + 20, 20)
        ridge = HEIGHT * base + np.cumsum(rs.normal(0, amp / 6, len(xs)))
        ridge = np.clip(ridge - (ridge.mean() - HEIGHT * base), HEIGHT * 0.25, HEIGHT)
        draw.polygon([(0, HEIGHT)] + list(zip(xs.tolist(), ridge.tolist())) + [(WIDTH, HEIGHT)], fill=color)
    for _ in range(140):  # árboles en la ladera más cercana
        x, h = rs.randint(0, WIDTH), rs.randint(18, 46)
        base_y = rs.randint(int(HEIGHT * 0.86), HEIGHT)
        draw.polygon([(x, base_y - h), (x - h // 4, base_y), (x + h // 4, base_y)], fill=(14, 22, 30))
    grain = rs.normal(0, 4, (HEIGHT, WIDTH, 1))
    arr = np.clip(np.asarray(img, dtype=np.float32) + grain, 0, 255).astype(np.uint8)
    return Image.fromarray(arr).filter(ImageFilter.GaussianBlur(0.6))


def _save_data_url(url: str, path: str) -> None:
    with open(path, "wb") as fh:
        fh.write(base64.b64decode(url.split(",", 1)[1]))


def generate(out: str) -> dict:
    from core.image_protector import ImageProtector  # PyTorch solo hace falta aquí

    os.makedirs(out, exist_ok=True)
    original = os.path.join(out, "original.png")
    illustration().save(original, optimize=True)

    result = ImageProtector(original).compare(STRENGTH, MARK_TEXT, MARK_OPACITY)
    _save_data_url(result["original"]["model_view"], os.path.join(out, "original_model.jpg"))
    result["original"] = {"image": "/examples/original.png", "model_view": "/examples/original_model.jpg"}
    for key in ("cloak", "watermark"):
        files = {"image": f"{key}.png", "model_view": f"{key}_model.jpg", "difference": f"{key}_diff.jpg"}
        for field, name in files.items():
            _save_data_url(result[key][field], os.path.join(out, name))
            result[key][field] = f"/examples/{name}"

    with tempfile.TemporaryDirectory() as tmp:
        cloak_copy = os.path.join(tmp, "cloak.png")
        Image.open(os.path.join(out, "cloak.png")).save(cloak_copy)
        stressed = ImageStressor(cloak_copy).apply(**STRESS)
    with open(os.path.join(out, "stressed.jpg"), "wb") as fh:
        fh.write(stressed)

    result["mark"] = {"text": MARK_TEXT, "opacity": MARK_OPACITY}
    result["stressed"] = {"image": "/examples/stressed.jpg", **STRESS, "source": "cloak"}
    result["source"] = "Ilustración sintética generada por scripts/generate_examples.py (sin derechos de terceros)."
    with open(os.path.join(out, "manifest.json"), "w", encoding="utf-8") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=2)
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera los ejemplos precalculados del Módulo 1.")
    parser.add_argument("--out", default=DEFAULT_OUT)
    args = parser.parse_args()
    result = generate(os.path.abspath(args.out))
    c, w = result["cloak"], result["watermark"]
    print(f"Ejemplos en {os.path.abspath(args.out)} ({result['settings']['seconds']} s)")
    print(f"Perturbación: persona {c['human_similarity']}, modelo {c['model_similarity']}, modelo tras JPEG {c['model_similarity_jpeg']}")
    print(f"Marca de agua: persona {w['human_similarity']}, modelo {w['model_similarity']}, modelo tras JPEG {w['model_similarity_jpeg']}")


if __name__ == "__main__":
    main()
