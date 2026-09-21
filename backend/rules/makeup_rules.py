"""Builds a makeup look from the face profile, the colour season and an occasion.

Colour comes from the season palettes already computed by the colour engine, so
Makeup Studio and Colour Studio never disagree. Technique comes from the
attributes the user confirmed. Everything is deterministic.
"""
from __future__ import annotations

from rules.color_palettes import SEASONS
from rules.makeup_library import (
    AESTHETIC_BY_KEY, AESTHETICS, FOUNDATION_GUIDE, OCCASIONS, techniques_for,
)

# Attributes that change technique, in the order they are applied at the mirror.
_TECHNIQUE_ORDER = ("facial_contrast", "eye_shape", "brow_shape", "cheek_contour", "lip_shape")


def recommend_aesthetics(
    *,
    occasion: str | None = None,
    max_minutes: int | None = None,
    intensity: str | None = None,
    contrast: str | None = None,
) -> list[dict]:
    """Rank the aesthetics. Occasion and time are hard filters; contrast orders."""
    results = []
    for aesthetic in AESTHETICS:
        if occasion and occasion not in aesthetic.occasions:
            continue
        if max_minutes is not None and aesthetic.minutes > max_minutes:
            continue
        if intensity and aesthetic.intensity != intensity:
            continue

        score = 0.0
        reasons: list[str] = []

        # Facial contrast is the strongest honest signal for makeup intensity.
        preferred = {
            "soft": ("bare", "soft"),
            "medium": ("soft", "defined"),
            "defined": ("defined", "bold"),
        }.get(contrast or "", ())
        if aesthetic.intensity in preferred:
            score += 2.0
            reasons.append(
                f"Sits at the intensity that tends to suit {contrast} facial contrast."
            )
        if occasion:
            score += 1.0
            reasons.append(f"Works for {occasion}.")
        if max_minutes is not None:
            score += 0.5
            reasons.append(f"About {aesthetic.minutes} minutes.")
        if not reasons:
            reasons.append(aesthetic.summary)

        results.append({
            "key": aesthetic.key,
            "name": aesthetic.name,
            "summary": aesthetic.summary,
            "signature": list(aesthetic.signature),
            "intensity": aesthetic.intensity,
            "minutes": aesthetic.minutes,
            "occasions": list(aesthetic.occasions),
            "origin": aesthetic.origin,
            "score": round(score, 2),
            "reasons": reasons,
        })

    results.sort(key=lambda r: (-r["score"], r["minutes"], r["name"]))
    return results


def _palette_colours(season: str | None) -> dict:
    data = SEASONS.get(season) if season else None
    if not data:
        return {"lipstick": [], "blush": [], "eyeshadow": [], "season": None, "seasonLabel": None}
    return {
        "season": season,
        "seasonLabel": data["label"],
        "lipstick": list(data.get("lipstick", [])),
        "blush": list(data.get("blush", [])),
        "eyeshadow": list(data.get("eyeshadow", [])),
    }


def build_look(
    aesthetic_key: str,
    *,
    season: str | None = None,
    attributes: dict[str, str] | None = None,
    occasion: str | None = None,
    undertone: str | None = None,
) -> dict | None:
    """One complete look: steps, technique per confirmed attribute, palette.

    `attributes` maps attribute key to the option the user confirmed. Attributes
    that are still unset simply contribute nothing — no placeholder advice.
    """
    aesthetic = AESTHETIC_BY_KEY.get(aesthetic_key)
    if aesthetic is None:
        return None

    attributes = attributes or {}
    technique_blocks = []
    for attr_key in _TECHNIQUE_ORDER:
        option_key = attributes.get(attr_key)
        if not option_key:
            continue
        for technique in techniques_for(attr_key, option_key):
            technique_blocks.append({
                "key": technique.key,
                "name": technique.name,
                "basedOn": attr_key,
                "basedOnValue": option_key,
                "steps": list(technique.steps),
                "note": technique.note,
            })

    missing = [k for k in _TECHNIQUE_ORDER if not attributes.get(k)]
    palette = _palette_colours(season)

    foundation = dict(FOUNDATION_GUIDE)
    if undertone:
        foundation = {
            **FOUNDATION_GUIDE,
            "yourUndertone": undertone,
            "shadeFamily": FOUNDATION_GUIDE["undertoneHint"].get(undertone),
        }

    return {
        "aesthetic": {
            "key": aesthetic.key,
            "name": aesthetic.name,
            "summary": aesthetic.summary,
            "intensity": aesthetic.intensity,
            "minutes": aesthetic.minutes,
            "origin": aesthetic.origin,
        },
        "occasion": occasion,
        "steps": list(aesthetic.signature),
        "techniques": technique_blocks,
        # Named so the UI can prompt rather than silently give generic advice.
        "missingAttributes": missing,
        "palette": palette,
        "foundation": foundation,
    }


def occasion_options() -> list[str]:
    return list(OCCASIONS)
