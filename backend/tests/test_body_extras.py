"""Unit tests for posture (F8) and body guidance (F9)."""
from ml.body_analysis import _posture
from rules.body_guidance import body_balance_tips


def test_posture_even_centered():
    p = _posture((100, 200), (200, 200), (150, 120), (130, 130), (170, 130))
    assert p["level"] == "even"
    assert p["headLean"] == "centered"


def test_posture_tilted_shoulders():
    p = _posture((100, 180), (200, 220), (150, 120), (130, 130), (170, 130))
    assert p["level"] == "tilted"
    assert p["shoulderTilt"] >= 7.0


def test_posture_head_lean_right():
    p = _posture((100, 200), (200, 200), (150, 120), (160, 130), (210, 130))
    assert p["headLean"] == "leaning right"


def test_guidance_known_shape():
    g = body_balance_tips({"shape": "pear", "proportions": {}})
    assert "shoulders" in g["emphasize"]
    assert g["balance"]
    assert g["fitNotes"]


def test_guidance_unknown_shape_default():
    g = body_balance_tips({"shape": "weird", "proportions": {}})
    assert g["balance"].startswith("Aim for balanced")


def test_guidance_short_leg_ratio_adds_note():
    g = body_balance_tips({"shape": "rectangle", "proportions": {"legToTorso": 0.8}})
    assert any("High-rise" in n for n in g["fitNotes"])
