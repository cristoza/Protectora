import io

import pytest
from fastapi.testclient import TestClient
from PIL import Image

import main
from core.publication_advisor import advise, estimate_jpeg_quality, load_rules

client = TestClient(main.app)

BASE_AUDIT = {"has_author": True, "has_copyright": True, "has_gps": False, "exclusion_tags": ["noai"],
              "format": "PNG", "c2pa": {"present": True, "valid": True}}


def ids(audit, quality=None, lossy=False):
    return {r["id"] for r in advise({**BASE_AUDIT, **audit}, quality, lossy)}


ALWAYS = {"terminos", "reauditar"}


def test_fully_protected_only_general_advice():
    assert ids({}) == ALWAYS


@pytest.mark.parametrize("patch,rule", [
    ({"has_author": False}, "sin_autor"),
    ({"has_copyright": False}, "sin_copyright"),
    ({"exclusion_tags": []}, "sin_noai"),
    ({"has_gps": True}, "gps"),
    ({"c2pa": {"present": False, "valid": False}}, "sin_c2pa"),
    ({"c2pa": {"present": True, "valid": False}}, "c2pa_invalida"),
])
def test_each_rule_triggers(patch, rule):
    assert ids(patch) == ALWAYS | {rule}


def test_lossy_high_quality():
    assert "perdida_alta" in ids({}, quality=95, lossy=True)
    assert "perdida_alta" not in ids({}, quality=75, lossy=True)
    assert "perdida_alta" not in ids({}, quality=None, lossy=True)


def test_sorted_by_severity():
    sev = [r["severity"] for r in advise({**BASE_AUDIT, "has_gps": True, "exclusion_tags": []}, None, False)]
    assert sev == sorted(sev, key=["alta", "media", "info"].index)


def test_rules_file_is_valid():
    for rule in load_rules():
        assert {"id", "severity", "when", "title", "detail"} <= rule.keys()
        assert rule["when"] == "always" or isinstance(rule["when"], list)


@pytest.mark.parametrize("q", [30, 50, 75, 90, 95])
def test_quality_estimate(q):
    buf = io.BytesIO()
    Image.effect_noise((128, 128), 40).convert("RGB").save(buf, "JPEG", quality=q)
    assert estimate_jpeg_quality(Image.open(io.BytesIO(buf.getvalue()))) == q


def test_endpoint(signed_jpeg, plain_jpeg, no_leftover_temp):
    with open(plain_jpeg, "rb") as fh:
        res = client.post("/api/publication-advice", files={"file": ("plano.jpg", fh.read(), "image/jpeg")})
    body = res.json()
    assert res.status_code == 200
    assert body["jpeg_quality"] == 92 and body["lossy"] is True
    assert {"sin_autor", "sin_copyright", "sin_noai", "sin_c2pa", "perdida_alta"} <= {r["id"] for r in body["recommendations"]}

    with open(signed_jpeg, "rb") as fh:
        res = client.post("/api/publication-advice", files={"file": ("firmado.jpg", fh.read(), "image/jpeg")})
    assert {r["id"] for r in res.json()["recommendations"]} == ALWAYS | {"perdida_alta"}


def test_endpoint_rejects_and_cleans(no_leftover_temp):
    assert client.post("/api/publication-advice", files={"file": ("x.jpg", b"nada", "image/jpeg")}).status_code == 422
    assert client.post("/api/publication-advice", files={"file": ("x.gif", b"nada", "image/gif")}).status_code == 415
