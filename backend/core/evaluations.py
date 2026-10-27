"""Almacenamiento de las evaluaciones de usabilidad y comprensión (SQLite estándar).

Solo se guarda lo que envía el formulario: un código de participante anónimo generado en el
cliente, la fecha (sin hora), las respuestas SUS con su puntuación y las respuestas de
comprensión. Ni imágenes, ni nombres, ni IP, ni navegador.
"""
from __future__ import annotations

import csv
import io
import json
import os
import sqlite3
from datetime import date
from typing import Dict, List

from core.sus import SUS_ITEMS, sus_score

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "evaluations.sqlite")

SCHEMA = """
CREATE TABLE IF NOT EXISTS evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    participant_code TEXT NOT NULL UNIQUE,
    created_on TEXT NOT NULL,
    sus_items TEXT NOT NULL,
    sus_score REAL NOT NULL,
    comprehension TEXT NOT NULL
)
"""


class DuplicateParticipant(Exception):
    pass


def _connect() -> sqlite3.Connection:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.execute(SCHEMA)
    return conn


def save(participant_code: str, sus: List[int], comprehension: Dict[str, Dict[str, object]]) -> float:
    score = sus_score(sus)
    conn = _connect()
    try:
        with conn:
            conn.execute(
                "INSERT INTO evaluations (participant_code, created_on, sus_items, sus_score, comprehension) VALUES (?, ?, ?, ?, ?)",
                (participant_code, date.today().isoformat(), json.dumps(sus), score, json.dumps(comprehension, ensure_ascii=False)),
            )
    except sqlite3.IntegrityError:
        raise DuplicateParticipant()
    finally:
        conn.close()
    return score


def export_csv() -> str:
    """Una fila por participante y, al final, la media de cada columna numérica."""
    conn = _connect()
    try:
        rows = conn.execute(
            "SELECT participant_code, created_on, sus_items, sus_score, comprehension FROM evaluations ORDER BY id"
        ).fetchall()
    finally:
        conn.close()

    parsed = [(code, day, json.loads(items), score, json.loads(comp)) for code, day, items, score, comp in rows]
    questions = sorted({q for *_, comp in parsed for q in comp})
    header = (["participant_code", "created_on"] + [f"sus_{i}" for i in range(1, SUS_ITEMS + 1)]
              + ["sus_score", "comprehension_correct", "comprehension_total"] + [f"q_{q}" for q in questions])
    out = io.StringIO()
    writer = csv.writer(out)
    writer.writerow(header)
    for code, day, items, score, comp in parsed:
        correct = sum(1 for a in comp.values() if a.get("correct"))
        answers = [comp.get(q, {}).get("answer", "") for q in questions]
        writer.writerow([code, day] + items + [score, correct, len(comp)] + answers)
    if parsed:
        n = len(parsed)
        means = [round(sum(p[2][i] for p in parsed) / n, 2) for i in range(SUS_ITEMS)]
        mean_score = round(sum(p[3] for p in parsed) / n, 2)
        mean_correct = round(sum(sum(1 for a in p[4].values() if a.get("correct")) for p in parsed) / n, 2)
        mean_total = round(sum(len(p[4]) for p in parsed) / n, 2)
        writer.writerow([f"MEDIA (n={n})", ""] + means + [mean_score, mean_correct, mean_total] + [""] * len(questions))
    return out.getvalue()
