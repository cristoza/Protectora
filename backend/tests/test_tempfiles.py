"""Garantía de privacidad: ningún archivo subido queda en disco, ni siquiera si el análisis falla."""
import pytest
from fastapi.testclient import TestClient

import main
from core import metadata_reader, resistance_suite

client = TestClient(main.app, raise_server_exceptions=False)


def boom(*args, **kwargs):
    raise RuntimeError("fallo forzado")


@pytest.mark.parametrize("path,target,attr", [
    ("/api/audit", metadata_reader.MetadataReader, "analyze"),
    ("/api/write-metadata", metadata_reader.MetadataReader, "analyze"),
    ("/api/stress-test", main.ImageStressor, "apply"),
    ("/api/stress-suite", resistance_suite, "encode"),
    ("/api/publication-advice", metadata_reader.MetadataReader, "analyze"),
])
def test_temp_removed_on_unexpected_error(path, target, attr, jpeg_bytes, monkeypatch, no_leftover_temp):
    monkeypatch.setattr(target, attr, boom)
    res = client.post(path, files={"file": ("foto.jpg", jpeg_bytes, "image/jpeg")}, data={"author": "Ana"})
    assert res.status_code == 500
    # no_leftover_temp comprueba al salir que la carpeta temporal quedó vacía.


@pytest.mark.parametrize("path", ["/api/audit", "/api/write-metadata", "/api/stress-test", "/api/stress-suite", "/api/publication-advice"])
def test_temp_removed_on_success_and_on_invalid_image(path, jpeg_bytes, no_leftover_temp):
    ok = client.post(path, files={"file": ("foto.jpg", jpeg_bytes, "image/jpeg")}, data={"author": "Ana"})
    bad = client.post(path, files={"file": ("foto.jpg", b"no es imagen", "image/jpeg")}, data={"author": "Ana"})
    assert ok.status_code == 200
    assert bad.status_code == 422
