import csv
import io

import pytest
from fastapi.testclient import TestClient

import main
from core import evaluations, knowledge

client = TestClient(main.app)
CODE = "K7QX-M2PA"


@pytest.fixture(autouse=True)
def temp_db(tmp_path, monkeypatch):
    monkeypatch.setattr(evaluations, "DB_PATH", str(tmp_path / "evaluations.sqlite"))
    monkeypatch.delenv("EVAL_EXPORT_TOKEN", raising=False)


def _payload(phase, right=None, code=CODE, **extra):
    """Respuestas correctas en las `right` primeras preguntas (todas si es None) y erróneas en el resto."""
    ins = knowledge.load_instrument(phase)
    answers = {}
    for i, q in enumerate(ins["questions"]):
        wrong = next(o["id"] for o in q["options"] if o["id"] != q["correct"])
        answers[q["id"]] = q["correct"] if right is None or i < right else wrong
    efficacy = {item["id"]: 3 for item in ins["self_efficacy"]["items"]}
    return {"participant_code": code, "answers": answers, "self_efficacy": efficacy, **extra}


@pytest.mark.parametrize("phase", ["diagnostico", "final"])
def test_public_instrument_hides_keys(phase):
    res = client.get(f"/api/knowledge/{phase}")
    assert res.status_code == 200
    data = res.json()
    assert len(data["questions"]) == 18 and data["validated"] is False
    assert len(data["self_efficacy"]["items"]) == 5
    assert all(set(q) == {"id", "objective", "question", "options"} for q in data["questions"])
    assert '"correct"' not in res.text and '"feedback"' not in res.text


def test_profile_only_in_diagnostic():
    assert client.get("/api/knowledge/diagnostico").json()["profile"]
    assert client.get("/api/knowledge/final").json()["profile"] == []


def test_unknown_phase():
    assert client.get("/api/knowledge/otra").status_code == 422


def test_diagnostic_is_graded_on_server_without_feedback():
    res = client.post("/api/knowledge/diagnostico", json=_payload("diagnostico", right=9))
    assert res.status_code == 201
    data = res.json()
    assert (data["correct"], data["total"], data["score"]) == (9, 18, 50.0)
    assert "results" not in data and data["comparison"] is None
    assert sum(o["total"] for o in data["by_objective"].values()) == 18


def test_final_returns_feedback_and_gain():
    client.post("/api/knowledge/diagnostico", json=_payload("diagnostico", right=9))
    res = client.post("/api/knowledge/final", json=_payload("final", right=18))
    assert res.status_code == 201
    data = res.json()
    assert data["score"] == 100.0
    assert data["comparison"] == {"pre_score": 50.0, "post_score": 100.0, "gain": 1.0}
    assert all(r["feedback"] and r["correct"] for r in data["results"])


def test_final_without_diagnostic_has_no_comparison():
    res = client.post("/api/knowledge/final", json=_payload("final", right=0))
    assert res.json()["comparison"] is None and res.json()["score"] == 0.0


def test_gain_undefined_when_diagnostic_perfect():
    assert knowledge.normalized_gain(100, 100) is None
    assert knowledge.normalized_gain(40, 70) == 0.5


def test_duplicate_phase_rejected_but_other_phase_allowed():
    assert client.post("/api/knowledge/diagnostico", json=_payload("diagnostico")).status_code == 201
    assert client.post("/api/knowledge/diagnostico", json=_payload("diagnostico")).status_code == 409
    assert client.post("/api/knowledge/final", json=_payload("final")).status_code == 201


def test_client_cannot_claim_correctness():
    body = _payload("diagnostico", right=0)
    body["answers"] = {k: {"answer": v, "correct": True} for k, v in body["answers"].items()}
    assert client.post("/api/knowledge/diagnostico", json=body).status_code == 422


@pytest.mark.parametrize("mutate", [
    lambda b: b["answers"].pop("D01"),
    lambda b: b["answers"].update(D01="z"),
    lambda b: b["answers"].update(X99="a"),
    lambda b: b["self_efficacy"].pop("AE1"),
    lambda b: b["self_efficacy"].update(AE1=6),
    lambda b: b.update(participant_code="ana pérez"),
    lambda b: b.update(name="Ana"),
    lambda b: b.update(profile={"P1": "astronauta"}),
    lambda b: b.update(profile={"P1": ["ilustracion"]}),
    lambda b: b.update(profile={"P3": "noai"}),
    lambda b: b.update(profile={"P9": "x"}),
])
def test_invalid_submissions(mutate):
    body = _payload("diagnostico")
    mutate(body)
    assert client.post("/api/knowledge/diagnostico", json=body).status_code == 422


def test_optional_profile_is_accepted():
    body = _payload("diagnostico", profile={"P1": "fotografia", "P3": ["marca", "noai"]})
    assert client.post("/api/knowledge/diagnostico", json=body).status_code == 201


def test_only_anonymous_fields_are_stored():
    client.post("/api/knowledge/diagnostico", json=_payload("diagnostico"))
    conn = knowledge._connect()
    columns = [r[1] for r in conn.execute("PRAGMA table_info(knowledge_tests)")]
    conn.close()
    assert columns == ["id", "participant_code", "phase", "instrument_version", "created_on", "answers", "correct",
                       "total", "self_efficacy", "profile"]


def test_export_requires_token(monkeypatch):
    assert client.get("/api/knowledge/export").status_code == 403
    monkeypatch.setenv("EVAL_EXPORT_TOKEN", "secreto")
    assert client.get("/api/knowledge/export", headers={"Authorization": "Bearer otro"}).status_code == 403


def test_export_csv(monkeypatch):
    monkeypatch.setenv("EVAL_EXPORT_TOKEN", "secreto")
    client.post("/api/knowledge/diagnostico", json=_payload("diagnostico", right=9, profile={"P3": ["marca", "noai"]}))
    client.post("/api/knowledge/final", json=_payload("final", right=18))
    client.post("/api/knowledge/final", json=_payload("final", right=9, code="ZZZZ-1111"))
    res = client.get("/api/knowledge/export", headers={"Authorization": "Bearer secreto"})
    assert res.status_code == 200 and res.headers["content-type"].startswith("text/csv")
    rows = list(csv.DictReader(io.StringIO(res.text)))
    assert [(r["participant_code"], r["phase"]) for r in rows] == [(CODE, "diagnostico"), (CODE, "final"), ("ZZZZ-1111", "final")]
    assert rows[0]["score"] == "50.0" and rows[0]["q_D01"] == "1" and rows[0]["q_D18"] == "0" and rows[0]["q_F01"] == ""
    assert rows[0]["profile_P3"] == "marca|noai" and rows[0]["ae_AE1"] == "3"
    assert rows[1]["gain"] == "1.0" and rows[2]["gain"] == ""
