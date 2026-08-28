"""Turn measured features into deterministic recommendation rows.

Output matches the existing Recommendation shape used by the DB/API
(category, title, description, confidence, items), so nothing downstream
changes. These rules guarantee a complete baseline even with no AI keys.
"""
from __future__ import annotations

from .face_shape_rules import guide_for

RULE_CONFIDENCE = 0.9


def build_rule_recommendations(face: dict, colors: dict, body: dict) -> list[dict]:
    """Build shape-grounded recommendation rows from analysis data."""
    shape = (face or {}).get("shape") or "balanced"
    g = guide_for((face or {}).get("shape"))

    recs: list[dict] = [
        {
            "category": "hair",
            "title": f"Hairstyles for a {shape} face",
            "description": g.summary,
            "confidence": RULE_CONFIDENCE,
            "items": list(g.hairstyles),
        },
        {
            "category": "outfit",
            "title": "Flattering necklines",
            "description": "Necklines that balance your face shape.",
            "confidence": RULE_CONFIDENCE,
            "items": list(g.necklines),
        },
        {
            "category": "accessory",
            "title": "Glasses frames",
            "description": "Frame shapes that complement your proportions.",
            "confidence": RULE_CONFIDENCE,
            "items": list(g.glasses),
        },
        {
            "category": "accessory",
            "title": "Earrings",
            "description": "Earring shapes that suit your face.",
            "confidence": RULE_CONFIDENCE,
            "items": list(g.earrings),
        },
        {
            "category": "aesthetic",
            "title": "Makeup focus",
            "description": " ".join(g.makeup),
            "confidence": RULE_CONFIDENCE,
            "items": list(g.makeup),
        },
    ]
    return recs


def merge_recommendations(rule_recs: list[dict], llm_recs: list[dict]) -> list[dict]:
    """Rules are the floor; append only LLM recs not already covered.

    Dedup key is (category, lowercased title).
    """
    seen = {(r.get("category"), str(r.get("title", "")).lower()) for r in rule_recs}
    merged = list(rule_recs)
    for r in llm_recs or []:
        key = (r.get("category"), str(r.get("title", "")).lower())
        if key not in seen:
            seen.add(key)
            merged.append(r)
    return merged
