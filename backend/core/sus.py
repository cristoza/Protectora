"""Puntuación de la System Usability Scale (Brooke, 1996).

Diez ítems de 1 (totalmente en desacuerdo) a 5 (totalmente de acuerdo). Los ítems impares
están redactados en positivo y aportan `respuesta - 1`; los pares, en negativo, aportan
`5 - respuesta`. La suma (0 a 40) se multiplica por 2,5 para dar una puntuación de 0 a 100.
"""
from __future__ import annotations

from typing import Sequence

SUS_ITEMS = 10


def sus_score(items: Sequence[int]) -> float:
    if len(items) != SUS_ITEMS:
        raise ValueError("La escala SUS tiene 10 ítems.")
    total = 0
    for i, value in enumerate(items, 1):
        if isinstance(value, bool) or not isinstance(value, int) or not 1 <= value <= 5:
            raise ValueError("Cada respuesta SUS debe ser un entero de 1 a 5.")
        total += value - 1 if i % 2 else 5 - value
    return total * 2.5
