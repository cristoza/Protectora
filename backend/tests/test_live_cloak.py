import sys

from fastapi.testclient import TestClient

import main

client = TestClient(main.app)


def test_health_reports_live_cloak(monkeypatch):
    monkeypatch.delenv("ENABLE_LIVE_CLOAK", raising=False)
    assert client.get("/api/health").json() == {"status": "ok", "live_cloak": False}
    monkeypatch.setenv("ENABLE_LIVE_CLOAK", "1")
    assert client.get("/api/health").json()["live_cloak"] is True


def test_protect_disabled_by_default(monkeypatch, jpeg_bytes, no_leftover_temp):
    monkeypatch.delenv("ENABLE_LIVE_CLOAK", raising=False)
    res = client.post("/api/protect", files={"file": ("foto.jpg", jpeg_bytes, "image/jpeg")})
    assert res.status_code == 503
    assert "ENABLE_LIVE_CLOAK" in res.json()["detail"]


def test_app_starts_without_torch():
    # Importar main no debe cargar PyTorch: solo /api/protect con el cloak activado lo necesita.
    import subprocess

    code = "import sys, main; print('torch' in sys.modules)"
    out = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, check=True)
    assert out.stdout.strip() == "False"
