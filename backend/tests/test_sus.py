import pytest

from core.sus import sus_score


@pytest.mark.parametrize("items,expected", [
    ([3] * 10, 50.0),                      # todo neutro
    ([5, 1] * 5, 100.0),                   # mejor caso posible
    ([1, 5] * 5, 0.0),                     # peor caso posible
    ([5] * 10, 50.0),                      # acuerdo total con todo: impares 4, pares 0
    ([4, 2, 4, 2, 4, 2, 4, 2, 4, 2], 75.0),
    # Ejemplo con respuestas mixtas: (4+3+3+4+3) + (4+3+4+3+4) = 35 -> 87,5
    ([5, 1, 4, 2, 4, 1, 5, 2, 4, 1], 87.5),
])
def test_known_scores(items, expected):
    assert sus_score(items) == expected


@pytest.mark.parametrize("items", [[3] * 9, [3] * 11, [0] + [3] * 9, [6] + [3] * 9, [True] + [3] * 9, [3.5] + [3] * 9])
def test_invalid(items):
    with pytest.raises(ValueError):
        sus_score(items)
