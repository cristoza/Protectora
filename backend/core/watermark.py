"""Marca de agua visible (texto repetido en diagonal) y su máscara.

Vive aparte de `image_protector` para que la suite de resistencia pueda dibujar y
detectar la marca sin cargar PyTorch.
"""
from __future__ import annotations

import numpy as np
from PIL import Image, ImageDraw, ImageFont


def _font(size: int) -> ImageFont.ImageFont:
    # La fuente integrada de Pillow no trae tildes ni eñes; se prefiere una del sistema.
    for name in ("Arial.ttf", "DejaVuSans.ttf", "Helvetica.ttc"):
        try:
            return ImageFont.truetype(name, size)
        except OSError:
            continue
    return ImageFont.load_default(size=size)


def watermark_layer(size: tuple, text: str, opacity: int) -> Image.Image:
    """Capa RGBA del tamaño `size` con el texto repetido. `opacity` va de 0 a 100."""
    width, height = size
    font_size = max(16, round(max(size) / 18))
    font = _font(font_size)
    diag = int(np.hypot(width, height)) + font_size * 4
    layer = Image.new("RGBA", (diag, diag), (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    left, top, right, bottom = draw.textbbox((0, 0), text, font=font)
    step_x, step_y = right - left + font_size * 2, (bottom - top) * 3 + font_size
    alpha = round(255 * opacity / 100)
    for row, y in enumerate(range(0, diag, step_y)):
        for x in range(-(row % 2) * step_x // 2, diag, step_x):
            # Contorno oscuro y relleno claro: se lee sobre fondos claros y oscuros.
            draw.text((x, y), text, font=font, fill=(255, 255, 255, alpha),
                      stroke_width=max(1, font_size // 16), stroke_fill=(0, 0, 0, alpha))
    layer = layer.rotate(30, resample=Image.BICUBIC)
    ox, oy = (diag - width) // 2, (diag - height) // 2
    return layer.crop((ox, oy, ox + width, oy + height))


def draw_watermark(img: Image.Image, text: str, opacity: int) -> Image.Image:
    """Compone la marca sobre `img` y devuelve una imagen RGB."""
    base = img.convert("RGBA")
    return Image.alpha_composite(base, watermark_layer(base.size, text, opacity)).convert("RGB")


def watermark_mask(size: tuple, text: str) -> Image.Image:
    """Máscara con signo de la marca, en modo L: la marca a opacidad completa sobre gris 128.

    Por encima de 128 está el relleno claro y por debajo el contorno oscuro, así la máscara
    describe hacia dónde mueve la luminancia, sea cual sea el fondo.
    """
    gray = Image.new("RGBA", size, (128, 128, 128, 255))
    return Image.alpha_composite(gray, watermark_layer(size, text, 100)).convert("L")
