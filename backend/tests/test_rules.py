"""Tests for the deterministic face-shape rules layer (offline, no DB)."""
from rules.face_shape_rules import FACE_SHAPE_GUIDES, DEFAULT_GUIDE, guide_for
from rules.engine import build_rule_recommendations, merge_recommendations


def test_every_shape_has_full_guide():
    for shape, g in FACE_SHAPE_GUIDES.items():
        assert g.summary
        assert g.hairstyles and g.necklines and g.glasses and g.earrings and g.makeup


def test_oval_returns_versatile_summary():
    assert "versatile" in guide_for("oval").summary.lower()


def test_lookup_is_case_insensitive():
    assert guide_for("ROUND") is FACE_SHAPE_GUIDES["round"]


def test_unknown_shape_falls_back_to_default():
    assert guide_for("potato") is DEFAULT_GUIDE
    assert guide_for(None) is DEFAULT_GUIDE


def test_engine_emits_db_shaped_rows():
    recs = build_rule_recommendations({"shape": "round"}, {}, {})
    assert recs
    for r in recs:
        assert {"category", "title", "description", "confidence", "items"} <= r.keys()
    assert any(r["category"] == "hair" for r in recs)
    assert any(r["category"] == "outfit" for r in recs)


def test_engine_handles_missing_face_data():
    recs = build_rule_recommendations({}, {}, {})
    assert recs  # falls back to oval, no crash
    assert "balanced" in recs[0]["title"]


def test_merge_keeps_rules_and_adds_new_llm_recs():
    rules = build_rule_recommendations({"shape": "oval"}, {}, {})
    llm = [
        {"category": "hair", "title": f"Hairstyles for a oval face", "description": "dup",
         "confidence": 0.5, "items": []},  # duplicate -> dropped
        {"category": "color", "title": "Jewel tones", "description": "new",
         "confidence": 0.8, "items": []},  # new -> kept
    ]
    merged = merge_recommendations(rules, llm)
    titles = [(r["category"], r["title"]) for r in merged]
    assert ("color", "Jewel tones") in titles
    # duplicate hair title appears only once
    assert sum(1 for c, t in titles if c == "hair" and "oval" in t.lower()) == 1
