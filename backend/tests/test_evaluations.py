import csv
import io

import pytest
from fastapi.testclient import TestClient

import main
from core import evaluations

client = TestClient(main.app)

VALID = {
    "participant_code": "K7QX-M2PA",
    "sus": [4, 2, 4, 2, 4, 2, 4, 2, 4, 2],
    "comprehension": {"noai": {"answer": "b", "correct": True}, "c2pa": {"answer": "a", "correct": False}},
}


@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(evaluations, "DB_PATH", str(tmp_path / "evaluations.sqlite"))
    monkeypatch.delenv("EVAL_EXPORT_TOKEN", raising=False)


def test_create_and_score():
    res = client.post("/api/evaluations", json=VALID)
    assert res.status_code == 201
    assert res.json() == {"participant_code": "K7QX-M2PA", "sus_score": 75.0}


def test_duplicate_code_rejected():
    assert client.post("/api/evaluations", json=VALID).status_code == 201
    res = client.post("/api/evaluations", json=VALID)
    assert res.status_code == 409


@pytest.mark.parametrize("patch", [
    {"participant_code": "ana pérez"},
    {"participant_code": "AB"},
    {"sus": [3] * 9},
    {"sus": [0] + [3] * 9},
    {"sus": [6] + [3] * 9},
    {"comprehension": {"q 1": {"answer": "a", "correct": True}}},
    {"comprehension": {"q1": {"answer": "<script>", "correct": True}}},
    {"name": "Ana"},
])
def test_invalid_payloads(patch):
    res = client.post("/api/evaluations", json={**VALID, **patch})
    assert res.status_code == 422


def test_only_anonymous_fields_are_stored():
    client.post("/api/evaluations", json=VALID)
    conn = evaluations._connect()
    columns = [r[1] for r in conn.execute("PRAGMA table_info(evaluations)")]
    conn.close()
    assert columns == ["id", "participant_code", "created_on", "sus_items", "sus_score", "comprehension"]


def test_export_forbidden_without_token_env():
    res = client.get("/api/evaluations/export", headers={"Authorization": "Bearer algo"})
    assert res.status_code == 403


def test_export_forbidden_with_wrong_token(monkeypatch):
    monkeypatch.setenv("EVAL_EXPORT_TOKEN", "secreto")
    assert client.get("/api/evaluations/export").status_code == 403
    assert client.get("/api/evaluations/export", headers={"Authorization": "Bearer otro"}).status_code == 403


def test_export_csv(monkeypatch):
    monkeypatch.setenv("EVAL_EXPORT_TOKEN", "secreto")
    client.post("/api/evaluations", json=VALID)
    client.post("/api/evaluations", json={**VALID, "participant_code": "ZZZZ-1111", "sus": [3] * 10})
    res = client.get("/api/evaluations/export", headers={"Authorization": "Bearer secreto"})
    assert res.status_code == 200 and res.headers["content-type"].startswith("text/csv")
    rows = list(csv.DictReader(io.StringIO(res.text)))
    assert [r["participant_code"] for r in rows] == ["K7QX-M2PA", "ZZZZ-1111", "MEDIA (n=2)"]
    assert rows[0]["sus_score"] == "75.0" and rows[0]["comprehension_correct"] == "1"
    assert rows[2]["sus_score"] == "62.5"
