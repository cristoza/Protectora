"""Degradaciones habituales de la web (recompresión, reducción, remuestreo) para probar
cuánto sobrevive una imagen a una plataforma de publicación."""
from __future__ import annotations

import io

from PIL import Image


class ImageStressor:
    def __init__(self, path: str):
        self.path = path

    def apply(self, quality: int = 60, scale: float = 0.5, passes: int = 1) -> bytes:
        """Reduce por `scale` (0.1 a 1.0) con Lanczos, recomprime en JPEG con `quality`
        y devuelve los bytes. `passes` repite la recompresión, como al re-subir varias veces."""
        quality = max(1, min(95, int(quality)))
        scale = max(0.1, min(1.0, float(scale)))
        passes = max(1, min(5, int(passes)))

        with Image.open(self.path) as img:
            img.load()
            img = self._flatten(img)

        if scale < 1.0:
            size = (max(1, round(img.width * scale)), max(1, round(img.height * scale)))
            img = img.resize(size, Image.LANCZOS)

        data = b""
        for _ in range(passes):
            buf = io.BytesIO()
            img.save(buf, "JPEG", quality=quality)  # sin exif= ni icc_profile=: los metadatos se pierden, como en la web
            data = buf.getvalue()
            img = Image.open(io.BytesIO(data))
            img.load()
        return data

    @staticmethod
    def _flatten(img: Image.Image) -> Image.Image:
        """JPEG no admite transparencia: se compone sobre blanco."""
        if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
            rgba = img.convert("RGBA")
            bg = Image.new("RGB", rgba.size, (255, 255, 255))
            bg.paste(rgba, mask=rgba.split()[-1])
            return bg
        return img.convert("RGB")
