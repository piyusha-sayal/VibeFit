"""Unit tests for summary card (F6)."""
from types import SimpleNamespace

from services.card_service import card_fields, generate_summary_card, _hex_to_rgb


def _analysis():
    return SimpleNamespace(
        face_analysis={"shape": "oval", "overallScore": 7.8},
        color_analysis={"skinUndertone": "warm",
                        "seasonal": {"label": "Warm Autumn"},
                        "bestColors": [{"hex": "#aa3322"}, {"hex": "#114455"}]},
    )


def test_card_fields_populated():
    f = card_fields(_analysis(), "Aria")
    assert f["name"] == "Aria"
    assert f["shape"] == "Oval"
    assert f["overall"] == "7.8/10"
    assert f["season"] == "Warm Autumn"
    assert f["undertone"] == "Warm"
    assert f["swatches"] == ["#aa3322", "#114455"]


def test_card_fields_empty_defaults():
    f = card_fields(SimpleNamespace(face_analysis=None, color_analysis=None))
    assert f["shape"] == "—"
    assert f["overall"] == "—"
    assert f["swatches"] == []


def test_hex_to_rgb():
    assert _hex_to_rgb("#ff8000") == (255, 128, 0)


def test_generate_card_returns_png():
    out = generate_summary_card(_analysis(), "Aria")
    assert out[:8] == b"\x89PNG\r\n\x1a\n"
