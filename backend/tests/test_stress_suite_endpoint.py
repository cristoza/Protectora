import pytest
from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def test_stress_suite_returns_rows(jpeg_bytes, no_leftover_temp):
    res = client.post("/api/stress-suite", files={"file": ("foto.jpg", jpeg_bytes, "image/jpeg")},
                      data={"watermark_text": "© Ana", "jpeg_qualities": "40"})
    assert res.status_code == 200
    body = res.json()
    assert [r["id"] for r in body["rows"]][:1] == ["jpeg_q40"]
    assert body["baseline"]["watermark"]["applied"] is True


@pytest.mark.parametrize("value", ["0", "50,abc", "96", "10,20,30,40"])
def test_invalid_qualities(jpeg_bytes, value):
    res = client.post("/api/stress-suite", files={"file": ("foto.jpg", jpeg_bytes, "image/jpeg")}, data={"jpeg_qualities": value})
    assert res.status_code == 422


@pytest.mark.parametrize("field,value", [("crop_pct", "0"), ("crop_pct", "41"), ("resample_side", "10"), ("watermark_opacity", "95")])
def test_out_of_range_params(jpeg_bytes, field, value):
    res = client.post("/api/stress-suite", files={"file": ("foto.jpg", jpeg_bytes, "image/jpeg")}, data={field: value})
    assert res.status_code == 422


def test_rejects_extension(jpeg_bytes):
    res = client.post("/api/stress-suite", files={"file": ("foto.gif", jpeg_bytes, "image/gif")})
    assert res.status_code == 415


def test_corrupt_image_cleans_up(no_leftover_temp):
    res = client.post("/api/stress-suite", files={"file": ("foto.jpg", b"no es una imagen", "image/jpeg")})
    assert res.status_code == 422
    assert "imagen" in res.json()["detail"]
