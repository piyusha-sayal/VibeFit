"""Matching for the Accessories Explorer.

Nothing is ever hidden: an item that does not match the usual heuristic is
still returned, marked `suited: False`. Accessories are cheap to try and
personal to choose, so filtering them away would be the wrong call.
"""
from __future__ import annotations

from rules.accessories_library import (
    ACCESSORY_BY_KEY, CATEGORIES, EARRINGS, GLASSES, HAIR_ACCESSORIES, METALS,
    NECKLINES,
)

_CATEGORY_ITEMS = {
    "glasses": GLASSES,
    "earrings": EARRINGS,
    "necklines": NECKLINES,
    "hair_accessories": HAIR_ACCESSORIES,
}

# Season family to the metal that tends to sit with it.
_FAMILY_METAL = {"spring": "warm", "autumn": "warm", "summer": "cool", "winter": "cool"}


def recommend(category: str, face_shape: str | None = None,
              *, origin: str | None = None) -> list[dict]:
    items = _CATEGORY_ITEMS.get(category)
    if items is None:
        return []

    results = []
    for item in items:
        if origin and item.origin != origin:
            continue
        suited = bool(face_shape and face_shape in item.suits_shapes)
        universal = not item.suits_shapes
        results.append({
            "key": item.key,
            "name": item.name,
            "category": item.category,
            "description": item.description,
            "note": item.note,
            "origin": item.origin,
            "suited": suited,
            "universal": universal,
            "score": (2.0 if suited else 0.0) + (0.5 if universal else 0.0),
        })

    results.sort(key=lambda r: (-r["score"], r["name"]))
    return results


def recommend_metals(undertone: str | None = None, season_family: str | None = None) -> list[dict]:
    """Metals ranked by undertone. Both remain listed; neither is forbidden."""
    wanted = None
    if undertone in ("warm", "cool"):
        wanted = undertone
    elif season_family:
        wanted = _FAMILY_METAL.get(season_family)

    results = []
    for metal in METALS:
        suited = wanted is not None and metal["warmth"] in (wanted, "neutral")
        results.append({
            **metal,
            "suited": suited,
            "score": (2.0 if metal["warmth"] == wanted else 0.0)
            + (1.0 if metal["warmth"] == "neutral" else 0.0),
        })
    results.sort(key=lambda r: (-r["score"], r["name"]))
    return results


def all_categories(face_shape: str | None = None, *, undertone: str | None = None,
                   season_family: str | None = None) -> dict:
    return {
        "faceShape": face_shape,
        "categories": list(CATEGORIES),
        "glasses": recommend("glasses", face_shape),
        "earrings": recommend("earrings", face_shape),
        "necklines": recommend("necklines", face_shape),
        "hairAccessories": recommend("hair_accessories", face_shape),
        "metals": recommend_metals(undertone, season_family),
    }


def item(key: str):
    return ACCESSORY_BY_KEY.get(key)
