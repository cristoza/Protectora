import pytest
from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def post(path, data_bytes, name="foto.jpg", **form):
    return client.post(path, files={"file": (name, data_bytes, "image/jpeg")}, data=form)


@pytest.mark.parametrize("path", ["/api/audit", "/api/stress-test", "/api/write-metadata", "/api/stress-suite", "/api/publication-advice"])
def test_rejects_unsupported_extension(path, jpeg_bytes):
    res = post(path, jpeg_bytes, name="foto.gif", author="Ana")
    assert res.status_code == 415
    assert res.json()["detail"] == "Formato no soportado. Usa JPG, PNG, WebP o TIFF."


@pytest.mark.parametrize("path", ["/api/audit", "/api/stress-test", "/api/write-metadata", "/api/stress-suite", "/api/publication-advice"])
def test_rejects_too_large(path, jpeg_bytes, monkeypatch, no_leftover_temp):
    monkeypatch.setattr(main, "MAX_BYTES", 100)
    res = post(path, jpeg_bytes, author="Ana")
    assert res.status_code == 413
    assert "25 MB" in res.json()["detail"]


@pytest.mark.parametrize("field,value", [("quality", "0"), ("quality", "96"), ("scale", "0.05"), ("scale", "1.5"), ("passes", "0"), ("passes", "6")])
def test_stress_test_ranges(field, value, jpeg_bytes):
    assert post("/api/stress-test", jpeg_bytes, **{field: value}).status_code == 422


def test_stress_test_ok(jpeg_bytes, no_leftover_temp):
    res = post("/api/stress-test", jpeg_bytes, quality="40", scale="0.5", passes="2")
    assert res.status_code == 200 and res.headers["content-type"] == "image/jpeg"


def test_write_metadata_requires_author(jpeg_bytes):
    assert post("/api/write-metadata", jpeg_bytes).status_code == 422
    res = post("/api/write-metadata", jpeg_bytes, author="   ")
    assert res.status_code == 422 and "autor" in res.json()["detail"]


def test_write_metadata_ok(jpeg_bytes, no_leftover_temp):
    res = post("/api/write-metadata", jpeg_bytes, author="Ana", ai_opt_out="true")
    body = res.json()
    assert res.status_code == 200
    assert body["filename"] == "foto-firmada.jpg" and body["image"].startswith("data:image/jpeg;base64,")
    assert body["audit"]["has_author"] and "noai" in body["audit"]["exclusion_tags"]


@pytest.mark.parametrize("strength", ["media", "maxima"])
def test_protect_validation_when_enabled(strength, jpeg_bytes, monkeypatch):
    monkeypatch.setenv("ENABLE_LIVE_CLOAK", "1")
    if strength == "maxima":
        assert post("/api/protect", jpeg_bytes, strength=strength).status_code == 422
    else:
        assert post("/api/protect", jpeg_bytes, watermark_opacity="95").status_code == 422


def test_audit_contract(jpeg_bytes, no_leftover_temp):
    body = post("/api/audit", jpeg_bytes).json()
    assert set(body) == {"filename", "format", "dimensions", "vulnerability_score", "risk_level", "score_breakdown",
                         "has_author", "has_copyright", "has_gps", "exclusion_tags", "c2pa", "stats", "findings"}
