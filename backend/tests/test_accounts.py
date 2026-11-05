import os

import psycopg
import pytest
from fastapi.testclient import TestClient

import main
from core import accounts, db

TEST_DB = os.environ.get("TEST_DATABASE_URL", "postgresql:///escudo_visual_test")


def _db_available() -> bool:
    try:
        psycopg.connect(TEST_DB, connect_timeout=2).close()
        return True
    except psycopg.OperationalError:
        return False


pytestmark = pytest.mark.skipif(not _db_available(), reason="PostgreSQL de pruebas no disponible (createdb escudo_visual_test)")


@pytest.fixture(autouse=True)
def test_db(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DATABASE_URL", TEST_DB)
    monkeypatch.setattr(accounts, "UPLOAD_DIR", str(tmp_path / "uploads"))
    with db.connect() as conn:
        conn.execute("TRUNCATE users, sessions, progress, projects, images RESTART IDENTITY CASCADE")
    yield tmp_path / "uploads"


def _client(username="ana", password="contraseña-larga"):
    client = TestClient(main.app)
    res = client.post("/api/auth/register", json={"username": username, "password": password})
    assert res.status_code == 201
    return client


def _upload(client, jpeg_bytes, section="laboratorio", kind="original", name="foto.jpg", project_id=None):
    data = {"section": section, "kind": kind}
    if project_id is not None:
        data["project_id"] = str(project_id)
    return client.post("/api/images", files={"file": (name, jpeg_bytes, "image/jpeg")}, data=data)


def test_register_login_logout():
    client = _client("Ana")
    assert client.get("/api/auth/me").json() == {"user": {"id": 1, "username": "ana"}}
    assert client.post("/api/auth/logout").status_code == 204
    assert client.get("/api/auth/me").status_code == 401

    other = TestClient(main.app)
    assert other.post("/api/auth/login", json={"username": "ana", "password": "incorrecta1"}).status_code == 401
    assert other.post("/api/auth/login", json={"username": "nadie", "password": "contraseña-larga"}).status_code == 401
    assert other.post("/api/auth/login", json={"username": "ANA", "password": "contraseña-larga"}).status_code == 200
    assert other.get("/api/auth/me").status_code == 200


def test_register_validation_and_duplicate():
    _client("ana")
    res = TestClient(main.app).post("/api/auth/register", json={"username": "ana", "password": "otra-contraseña"})
    assert res.status_code == 409
    bad = [
        {"username": "a", "password": "contraseña-larga"},
        {"username": "con espacio", "password": "contraseña-larga"},
        {"username": "luis", "password": "corta"},
        {"username": "luis", "password": "contraseña-larga", "email": "x@y.z"},
    ]
    for body in bad:
        assert TestClient(main.app).post("/api/auth/register", json=body).status_code == 422


def test_password_is_not_stored_in_clear():
    _client("ana", "contraseña-larga")
    with db.connect() as conn:
        stored = conn.execute("SELECT password_hash FROM users").fetchone()["password_hash"]
    assert "contraseña" not in stored and stored.startswith("pbkdf2_sha256$")


def test_expired_session_is_rejected():
    client = _client()
    with db.connect() as conn:
        conn.execute("UPDATE sessions SET expires_at = now() - interval '1 second'")
    assert client.get("/api/auth/me").status_code == 401


IDENTITY = {"author": "Ana", "copyright": "", "aiOptOut": True, "stripGps": False}
PROTECTION = {"strength": "alta", "watermarkText": "© Ana", "watermarkOpacity": 50}
STRESS = {"quality": 30, "scalePct": 70, "passes": 3}
STATE = {"identity": IDENTITY, "protection": PROTECTION, "stress": STRESS, "audit": {"vulnerability_score": 40, "risk_level": "medio"}}


def test_progress_round_trip():
    client = _client()
    assert client.get("/api/progress").json() == {"progress": None}
    state = {"index": 4, "perturbed": True, "cloaked": False, "checks": {"formato": True},
             "identity": IDENTITY, "protection": PROTECTION, "stress": STRESS, "audit": {"score": 40}}
    assert client.put("/api/progress", json=state).status_code == 204
    assert client.get("/api/progress").json() == {"progress": state}
    assert client.put("/api/progress", json={**state, "extra": 1}).status_code == 422
    assert TestClient(main.app).get("/api/progress").status_code == 401


def test_projects_round_trip():
    client = _client()
    assert client.get("/api/projects").json() == {"projects": []}
    res = client.post("/api/projects", json={"name": "  Retrato  "})
    assert res.status_code == 201
    project = res.json()
    assert project["name"] == "Retrato" and project["images"] == [] and project["state"]["protection"]["strength"] == "media"

    pid = project["id"]
    assert client.patch(f"/api/projects/{pid}", json={"state": STATE}).status_code == 200
    assert client.patch(f"/api/projects/{pid}", json={"name": "Paisaje"}).json()["name"] == "Paisaje"
    got = client.get(f"/api/projects/{pid}").json()
    assert got["name"] == "Paisaje" and got["state"] == STATE

    listed = client.get("/api/projects").json()["projects"]
    assert [(p["id"], p["author"], p["risk_level"], p["image_count"]) for p in listed] == [(pid, "Ana", "medio", 0)]

    assert client.patch(f"/api/projects/{pid}", json={"state": {**STATE, "extra": 1}}).status_code == 422
    assert client.patch(f"/api/projects/{pid}", json={"name": "   "}).status_code == 422
    assert client.patch(f"/api/projects/{pid}", json={"state": {**STATE, "stress": {"quality": 99}}}).status_code == 422
    assert client.post("/api/projects", json={"name": "x", "state": {**STATE, "protection": {"strength": "máxima"}}}).status_code == 422
    assert client.get("/api/projects/999").status_code == 404
    assert TestClient(main.app).get("/api/projects").status_code == 401


def test_project_images_and_delete(jpeg_bytes, test_db, no_leftover_temp):
    client = _client()
    pid = client.post("/api/projects", json={"name": "Retrato"}).json()["id"]
    in_project = _upload(client, jpeg_bytes, project_id=pid).json()
    assert in_project["project_id"] == pid
    loose = _upload(client, jpeg_bytes).json()
    assert loose["project_id"] is None
    assert _upload(client, jpeg_bytes, project_id=999).status_code == 404

    assert [i["id"] for i in client.get(f"/api/projects/{pid}").json()["images"]] == [in_project["id"]]
    assert client.get("/api/projects").json()["projects"][0]["cover_id"] == in_project["id"]

    assert client.delete(f"/api/projects/{pid}").status_code == 204
    assert client.get(f"/api/projects/{pid}").status_code == 404
    assert client.delete(f"/api/projects/{pid}").status_code == 404
    assert [i["id"] for i in client.get("/api/images").json()["images"]] == [loose["id"]]
    assert len(os.listdir(test_db / "1")) == 1


def test_users_cannot_touch_other_projects(jpeg_bytes):
    ana = _client("ana")
    pid = ana.post("/api/projects", json={"name": "Mío"}).json()["id"]
    luis = _client("luis")
    assert luis.get("/api/projects").json() == {"projects": []}
    assert luis.get(f"/api/projects/{pid}").status_code == 404
    assert luis.patch(f"/api/projects/{pid}", json={"name": "Robado"}).status_code == 404
    assert _upload(luis, jpeg_bytes, project_id=pid).status_code == 404
    assert luis.delete(f"/api/projects/{pid}").status_code == 404
    assert ana.get(f"/api/projects/{pid}").json()["name"] == "Mío"


def test_images_save_list_download_delete(jpeg_bytes, test_db, no_leftover_temp):
    client = _client()
    res = _upload(client, jpeg_bytes, section="aprendizaje", kind="firmada")
    assert res.status_code == 201
    image = res.json()
    assert image["section"] == "aprendizaje" and image["kind"] == "firmada" and image["mime"] == "image/jpeg"
    assert image["audit"]["filename"] == "foto.jpg"
    _upload(client, jpeg_bytes, section="laboratorio")

    assert len(client.get("/api/images").json()["images"]) == 2
    assert [i["id"] for i in client.get("/api/images?section=aprendizaje").json()["images"]] == [image["id"]]

    file = client.get(f"/api/images/{image['id']}/file")
    assert file.status_code == 200 and file.content == jpeg_bytes
    assert "attachment" in file.headers["content-disposition"]

    assert client.delete(f"/api/images/{image['id']}").status_code == 204
    assert client.get(f"/api/images/{image['id']}/file").status_code == 404
    assert len(os.listdir(test_db / "1")) == 1


def test_images_validation(jpeg_bytes):
    client = _client()
    assert _upload(client, jpeg_bytes, section="otra").status_code == 422
    assert _upload(client, jpeg_bytes, kind="robada").status_code == 422
    assert _upload(client, jpeg_bytes, name="foto.gif").status_code == 415
    assert _upload(client, b"no es imagen", name="foto.jpg").status_code == 422
    assert _upload(TestClient(main.app), jpeg_bytes).status_code == 401


def test_users_cannot_see_each_other(jpeg_bytes):
    ana = _client("ana")
    image_id = _upload(ana, jpeg_bytes).json()["id"]
    luis = _client("luis")
    assert luis.get("/api/images").json() == {"images": []}
    assert luis.get(f"/api/images/{image_id}/file").status_code == 404
    assert luis.delete(f"/api/images/{image_id}").status_code == 404
    assert ana.get(f"/api/images/{image_id}/file").status_code == 200


def test_delete_account_removes_everything(jpeg_bytes, test_db):
    client = _client()
    _upload(client, jpeg_bytes)
    client.put("/api/progress", json={"index": 2})
    pid = client.post("/api/projects", json={"name": "Retrato"}).json()["id"]
    _upload(client, jpeg_bytes, project_id=pid)
    assert client.delete("/api/auth/me").status_code == 204
    assert client.get("/api/auth/me").status_code == 401
    assert not (test_db / "1").exists()
    with db.connect() as conn:
        for table in ("users", "sessions", "progress", "projects", "images"):
            assert conn.execute(f"SELECT count(*) AS n FROM {table}").fetchone()["n"] == 0
