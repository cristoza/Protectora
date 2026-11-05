"""Evaluación de conocimientos antes y después del recorrido: diagnóstico inicial y evaluación final.

Las preguntas, sus claves y la retroalimentación viven en `docs/addie/instrumentos/` (fuente única del
diseño ADDIE). El navegador recibe las preguntas sin claves y la corrección se hace aquí, para que el
resultado no dependa del cliente. Se guarda en la misma SQLite anónima que la escala SUS: código de
participante generado en el navegador, fase, versión del instrumento, fecha sin hora, respuestas,
autoeficacia y perfil opcional. Ni nombres, ni IP, ni navegador, ni imágenes.
"""
from __future__ import annotations

import csv
import io
import json
import os
import sqlite3
from datetime import date
from typing import Any, Dict, List, Optional, Union

from core import evaluations

INSTRUMENTS_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "docs", "addie", "instrumentos")
FILES = {"diagnostico": "diagnostico_inicial.json", "final": "evaluacion_final.json"}

SCHEMA = """
CREATE TABLE IF NOT EXISTS knowledge_tests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_code TEXT NOT NULL,
    phase TEXT NOT NULL CHECK (phase IN ('diagnostico', 'final')),
    instrument_version TEXT NOT NULL,
    created_on TEXT NOT NULL,
    answers TEXT NOT NULL,
    correct INTEGER NOT NULL,
    total INTEGER NOT NULL,
    self_efficacy TEXT NOT NULL,
    profile TEXT NOT NULL,
    UNIQUE (participant_code, phase)
)
"""


class DuplicateTest(Exception):
    pass


class InvalidSubmission(ValueError):
    pass


def load_instrument(phase: str) -> Dict[str, Any]:
    """Se lee en cada petición: editar el JSON cambia la prueba sin reiniciar el servidor."""
    with open(os.path.join(INSTRUMENTS_DIR, FILES[phase]), encoding="utf-8") as fh:
        instrument = json.load(fh)
    # La evaluación final reutiliza la escala de autoeficacia del diagnóstico para poder compararlas.
    if "same_as" in instrument.get("self_efficacy", {}):
        instrument["self_efficacy"] = load_instrument("diagnostico")["self_efficacy"]
    return instrument


def public_instrument(phase: str) -> Dict[str, Any]:
    """Lo que ve el navegador: preguntas y opciones, sin la respuesta correcta ni la explicación."""
    ins = load_instrument(phase)
    return {
        "phase": phase,
        "version": ins["version"],
        "validated": bool(ins.get("validated")),
        "instructions": ins.get("instructions", ""),
        "questions": [
            {"id": q["id"], "objective": q["objective"], "question": q["question"], "options": q["options"]}
            for q in ins["questions"]
        ],
        "self_efficacy": {"scale": ins["self_efficacy"]["scale"], "items": ins["self_efficacy"]["items"]},
        "profile": ins.get("profile", {}).get("items", []),
    }


def _validate(ins: Dict[str, Any], answers: Dict[str, str], self_efficacy: Dict[str, int],
              profile: Dict[str, Union[str, List[str]]]) -> None:
    questions = {q["id"]: {o["id"] for o in q["options"]} for q in ins["questions"]}
    if set(answers) != set(questions):
        raise InvalidSubmission("Responde todas las preguntas antes de enviar.")
    for qid, answer in answers.items():
        if answer not in questions[qid]:
            raise InvalidSubmission(f"La respuesta de la pregunta {qid} no es una opción válida.")
    if set(self_efficacy) != {i["id"] for i in ins["self_efficacy"]["items"]}:
        raise InvalidSubmission("Responde todas las afirmaciones sobre lo que sabes hacer.")
    items = {p["id"]: p for p in ins.get("profile", {}).get("items", [])}
    for pid, value in profile.items():
        item = items.get(pid)
        if item is None:
            raise InvalidSubmission("Hay una pregunta de perfil que no existe en este cuestionario.")
        chosen = value if isinstance(value, list) else [value]
        if isinstance(value, list) != bool(item.get("multiple")) or not chosen:
            raise InvalidSubmission(f"La respuesta de perfil {pid} no tiene el formato esperado.")
        if not set(chosen) <= {o["id"] for o in item["options"]}:
            raise InvalidSubmission(f"La respuesta de perfil {pid} no es una opción válida.")


def grade(ins: Dict[str, Any], answers: Dict[str, str]) -> List[Dict[str, Any]]:
    return [
        {
            "id": q["id"],
            "objective": q["objective"],
            "answer": answers[q["id"]],
            "correct": answers[q["id"]] == q["correct"],
            "correct_option": q["correct"],
            "feedback": q.get("feedback", ""),
        }
        for q in ins["questions"]
    ]


def by_objective(results: List[Dict[str, Any]]) -> Dict[str, Dict[str, int]]:
    out: Dict[str, Dict[str, int]] = {}
    for r in results:
        o = out.setdefault(r["objective"], {"correct": 0, "total": 0})
        o["total"] += 1
        o["correct"] += int(r["correct"])
    return out


def pct(correct: int, total: int) -> float:
    return round(100 * correct / total, 1) if total else 0.0


def normalized_gain(pre: float, post: float) -> Optional[float]:
    """Ganancia normalizada de Hake (1998), con puntajes en porcentaje. Indefinida si el diagnóstico fue 100."""
    return None if pre >= 100 else round((post - pre) / (100 - pre), 3)


def _connect() -> sqlite3.Connection:
    # Misma base anónima que las evaluaciones SUS (evaluations.DB_PATH), en su propia tabla.
    os.makedirs(os.path.dirname(evaluations.DB_PATH), exist_ok=True)
    conn = sqlite3.connect(evaluations.DB_PATH)
    conn.execute(SCHEMA)
    return conn


def _diagnostic_score(conn: sqlite3.Connection, code: str) -> Optional[float]:
    row = conn.execute(
        "SELECT correct, total FROM knowledge_tests WHERE participant_code = ? AND phase = 'diagnostico'", (code,)
    ).fetchone()
    return pct(*row) if row else None


def submit(phase: str, code: str, answers: Dict[str, str], self_efficacy: Dict[str, int],
           profile: Dict[str, Union[str, List[str]]]) -> Dict[str, Any]:
    ins = load_instrument(phase)
    _validate(ins, answers, self_efficacy, profile)
    results = grade(ins, answers)
    correct = sum(r["correct"] for r in results)
    stored = {r["id"]: {"answer": r["answer"], "correct": r["correct"]} for r in results}
    conn = _connect()
    try:
        with conn:
            conn.execute(
                "INSERT INTO knowledge_tests (participant_code, phase, instrument_version, created_on, answers, correct, total,"
                " self_efficacy, profile) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (code, phase, ins["version"], date.today().isoformat(), json.dumps(stored), correct, len(results),
                 json.dumps(self_efficacy), json.dumps(profile, ensure_ascii=False)),
            )
        pre = _diagnostic_score(conn, code) if phase == "final" else None
    except sqlite3.IntegrityError:
        raise DuplicateTest()
    finally:
        conn.close()

    score = pct(correct, len(results))
    response: Dict[str, Any] = {
        "participant_code": code,
        "phase": phase,
        "correct": correct,
        "total": len(results),
        "score": score,
        "by_objective": by_objective(results),
        "comparison": None,
    }
    if phase == "final":
        # Solo la evaluación final explica cada respuesta: en el diagnóstico se evita para no enseñar
        # las claves de las preguntas paralelas antes del recorrido.
        response["results"] = results
        if pre is not None:
            response["comparison"] = {"pre_score": pre, "post_score": score, "gain": normalized_gain(pre, score)}
    return response


def export_csv() -> str:
    """Una fila por prueba. En las finales con diagnóstico del mismo código se añade la ganancia normalizada."""
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT participant_code, phase, instrument_version, created_on, answers, correct, total, self_efficacy, profile"
            " FROM knowledge_tests ORDER BY participant_code, phase"
        ).fetchall()
    finally:
        conn.close()

    parsed = [(c, ph, v, d, json.loads(a), ok, tot, json.loads(se), json.loads(pr)) for c, ph, v, d, a, ok, tot, se, pr in rows]
    pre = {c: pct(ok, tot) for c, ph, _, _, _, ok, tot, _, _ in parsed if ph == "diagnostico"}
    items = sorted({q for p in parsed for q in p[4]})
    efficacy = sorted({k for p in parsed for k in p[7]})
    profile = sorted({k for p in parsed for k in p[8]})
    header = (["participant_code", "phase", "instrument_version", "created_on", "correct", "total", "score", "gain"]
              + [f"q_{q}" for q in items] + [f"ae_{k}" for k in efficacy] + [f"profile_{k}" for k in profile])
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(header)
    for code, phase, version, day, answers, ok, total, se, pr in parsed:
        score = pct(ok, total)
        gain = normalized_gain(pre[code], score) if phase == "final" and code in pre else None
        writer.writerow(
            [code, phase, version, day, ok, total, score, "" if gain is None else gain]
            + [("" if q not in answers else int(answers[q]["correct"])) for q in items]
            + [se.get(k, "") for k in efficacy]
            + ["|".join(v) if isinstance(v, list) else v for v in (pr.get(k, "") for k in profile)]
        )
    return out.getvalue()
