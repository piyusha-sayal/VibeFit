"""Clothing colour pairings.

Deterministic HSL geometry over the season palettes that already exist — no AI
call for something arithmetic can answer exactly, and no second set of seasons
for India. A saree and a suit are scored by the same colour maths.
"""
from __future__ import annotations

import colorsys

from rules.color_palettes import SEASONS

# Below this chroma a colour behaves as a neutral: it pairs with anything and
# has no meaningful hue relationship. Same threshold the mobile utility uses.
NEUTRAL_CHROMA = 0.12

HARMONIES = ("monochromatic", "analogous", "complementary", "neutral", "seasonal")

# Garment pairings the explorer offers, Indian and global side by side.
PAIRINGS = [
    {"key": "saree_blouse", "name": "Saree and blouse", "region": "indian",
     "roles": ["Saree", "Blouse"],
     "note": "A contrast blouse is the cheapest way to restyle a saree you own."},
    {"key": "lehenga_dupatta", "name": "Lehenga and dupatta", "region": "indian",
     "roles": ["Lehenga", "Dupatta"],
     "note": "The dupatta sits closest to your face, so put your best colour there."},
    {"key": "kurta_trouser", "name": "Kurta and trousers", "region": "indian",
     "roles": ["Kurta", "Trousers"],
     "note": "A neutral bottom lets the kurta carry the colour."},
    {"key": "shirt_trouser", "name": "Shirt and trousers", "region": "global",
     "roles": ["Shirt", "Trousers"],
     "note": "The shirt is beside your face; the trouser rarely is."},
    {"key": "suit_shirt", "name": "Suit and shirt", "region": "global",
     "roles": ["Suit", "Shirt"],
     "note": "Tonal reads more expensive than high contrast, almost always."},
    {"key": "dress_accessory", "name": "Dress and accessories", "region": "global",
     "roles": ["Dress", "Accessory"],
     "note": "One accent against a settled base."},
]

PAIRING_BY_KEY = {p["key"]: p for p in PAIRINGS}


def _hsl(hex_colour: str) -> tuple[float, float, float]:
    value = hex_colour.lstrip("#")
    r, g, b = (int(value[i:i + 2], 16) / 255 for i in (0, 2, 4))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360, s, l


def chroma(hex_colour: str) -> float:
    """Perceived colourfulness. Saturation alone calls ivory a colour."""
    _, s, l = _hsl(hex_colour)
    return s * (1 - abs(2 * l - 1))


def is_neutral(hex_colour: str) -> bool:
    return chroma(hex_colour) < NEUTRAL_CHROMA


def hue_distance(a: str, b: str) -> float:
    ha, _, _ = _hsl(a)
    hb, _, _ = _hsl(b)
    delta = abs(ha - hb) % 360
    return min(delta, 360 - delta)


def describe_pair(a: str, b: str) -> dict:
    """Name the relationship between two clothing colours, and why it works."""
    a_neutral, b_neutral = is_neutral(a), is_neutral(b)

    if a_neutral and b_neutral:
        return {
            "harmony": "neutral",
            "label": "Neutral pairing",
            "why": "Two neutrals. Quiet, and it never fights — texture does the work here.",
        }
    if a_neutral or b_neutral:
        return {
            "harmony": "neutral",
            "label": "Colour on neutral",
            "why": "One colour against a neutral. The colour leads and nothing competes.",
        }

    distance = hue_distance(a, b)
    if distance < 15:
        return {
            "harmony": "monochromatic",
            "label": "Tonal",
            "why": "The same hue at two depths. Reads long and deliberate.",
        }
    if distance <= 45:
        return {
            "harmony": "analogous",
            "label": "Analogous",
            "why": "Neighbouring hues. Harmonious without being flat.",
        }
    if distance >= 150:
        return {
            "harmony": "complementary",
            "label": "Complementary",
            "why": "Opposite hues. High energy — give one of them the smaller share.",
        }
    return {
        "harmony": "contrast",
        "label": "Contrast",
        "why": "Separated hues. Deliberate, and it needs a neutral to sit against.",
    }


def _swatches(season: str | None) -> list[dict]:
    data = SEASONS.get(season) if season else None
    if not data:
        return []
    seen, out = set(), []
    for role in ("best", "neutrals", "accents"):
        for swatch in data.get(role, []):
            if swatch["hex"] in seen:
                continue
            seen.add(swatch["hex"])
            out.append({**swatch, "role": role})
    return out


def pairing_suggestions(pairing_key: str, season: str | None, limit: int = 6) -> dict | None:
    """Concrete two-colour suggestions for one garment pairing.

    Without a season this returns the pairing and an empty suggestion list
    rather than inventing colours that are not the user's.
    """
    pairing = PAIRING_BY_KEY.get(pairing_key)
    if pairing is None:
        return None

    swatches = _swatches(season)
    suggestions = []
    for i, first in enumerate(swatches):
        for second in swatches[i + 1:]:
            relationship = describe_pair(first["hex"], second["hex"])
            suggestions.append({
                "roles": pairing["roles"],
                "colours": [first, second],
                **relationship,
            })

    # One of each harmony first, so the list teaches rather than repeats.
    ordered, seen_harmony = [], set()
    for suggestion in suggestions:
        if suggestion["harmony"] not in seen_harmony:
            seen_harmony.add(suggestion["harmony"])
            ordered.append(suggestion)
    ordered += [s for s in suggestions if s not in ordered]

    return {
        "key": pairing["key"],
        "name": pairing["name"],
        "region": pairing["region"],
        "roles": pairing["roles"],
        "note": pairing["note"],
        "season": season,
        "seasonLabel": SEASONS[season]["label"] if season in SEASONS else None,
        "palette": swatches,
        "suggestions": ordered[:limit],
    }


def explore(season: str | None, region: str | None = None) -> dict:
    pairings = [p for p in PAIRINGS if not region or p["region"] == region]
    return {
        "season": season,
        "seasonLabel": SEASONS[season]["label"] if season in SEASONS else None,
        "harmonies": list(HARMONIES),
        "pairings": [
            pairing_suggestions(p["key"], season, limit=4) for p in pairings
        ],
    }
