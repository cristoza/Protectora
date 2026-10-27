import io
import os

import numpy as np
import pytest
from PIL import Image, ImageDraw

from core.metadata_writer import write_metadata
from scripts.c2pa_test_signer import generate_test_credentials, sign_c2pa


def _photo(width: int = 900, height: int = 600) -> Image.Image:
    """Imagen sintética con degradado y formas, parecida en textura a una ilustración."""
    rs = np.random.RandomState(0)
    y, x = np.mgrid[0:height, 0:width]
    img = Image.fromarray((np.stack([x / width, y / height, (x + y) / (width + height)], -1) * 255).astype(np.uint8))
    draw = ImageDraw.Draw(img)
    for _ in range(60):
        cx, cy, r = rs.randint(0, width), rs.randint(0, height), rs.randint(10, 90)
        draw.ellipse((cx - r, cy - r, cx + r, cy + r), fill=tuple(int(v) for v in rs.randint(0, 255, 3)))
    return img


@pytest.fixture
def plain_jpeg(tmp_path):
    path = tmp_path / "plano.jpg"
    _photo().save(path, "JPEG", quality=92)
    return str(path)


@pytest.fixture
def signed_jpeg(tmp_path, plain_jpeg):
    """JPEG con autoría, noai (EXIF + XMP) y manifiesto C2PA válido."""
    data, fmt = write_metadata(plain_jpeg, "Ana Pérez", "© 2026 Ana Pérez", True, True)
    chain, key = generate_test_credentials()
    path = tmp_path / "firmado.jpg"
    path.write_bytes(sign_c2pa(data, fmt, chain, key, "firmado.jpg"))
    return str(path)


@pytest.fixture
def jpeg_bytes():
    buf = io.BytesIO()
    _photo(300, 200).save(buf, "JPEG")
    return buf.getvalue()


@pytest.fixture
def no_leftover_temp(monkeypatch, tmp_path):
    """Redirige los temporales a una carpeta propia para comprobar que quedan vacíos."""
    temp_dir = tmp_path / "tmp"
    temp_dir.mkdir()
    import tempfile

    monkeypatch.setattr(tempfile, "tempdir", str(temp_dir))
    yield temp_dir
    assert os.listdir(temp_dir) == [], "quedaron archivos temporales en disco"
