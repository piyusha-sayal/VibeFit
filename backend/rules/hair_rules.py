"""Deterministic matching over the hair library.

Filters are hard (a texture filter never returns a style that does not work on
that texture); face shape only reorders, because no cut is forbidden by a face
shape and telling someone otherwise would be both wrong and unkind.

Every result carries the reasons behind its position, so the UI can show why a
cut is near the top rather than presenting a ranked list as an oracle.
"""
from __future__ import annotations

from rules.color_palettes import SEASONS
from rules.hair_library import (
    BANGS, HAIR_COLOUR_BY_KEY, HAIR_COLOURS, HAIRSTYLE_BY_KEY, HAIRSTYLES,
    MAINTENANCE, PARTINGS,
)

VISUALISATION_DISCLAIMER = (
    "These are reference photos of the cut, not a prediction of your result. "
    "Your hair's density, growth pattern and the stylist's hand all change how "
    "it lands. Take the photo to the salon and talk it through."
)

_MAINTENANCE_RANK = {name: i for i, name in enumerate(MAINTENANCE)}
_LIFT_RANK = {"none": 0, "low": 1, "medium": 2, "high": 3}

# Seasonal families and the hair warmth that tends to sit with them. A
# preference, never a prohibition — the UI shows the rest below the fold.
_FAMILY_WARMTH = {"spring": "warm", "autumn": "warm", "summer": "cool", "winter": "cool"}


def _maintenance_allowed(style_level: str, ceiling: str | None) -> bool:
    if not ceiling:
        return True
    return _MAINTENANCE_RANK[style_level] <= _MAINTENANCE_RANK.get(ceiling, len(MAINTENANCE))


def recommend_hairstyles(
    face_shape: str | None,
    *,
    texture: str | None = None,
    length: str | None = None,
    maintenance: str | None = None,
    presentation: str | None = None,
    protective_only: bool = False,
    max_minutes: int | None = None,
    limit: int | None = None,
) -> list[dict]:
    """Rank the library for one person. Filters exclude; face shape only orders."""
    results: list[dict] = []

    for style in HAIRSTYLES:
        if texture and texture not in style.textures:
            continue
        if length and style.length != length:
            continue
        if not _maintenance_allowed(style.maintenance, maintenance):
            continue
        if presentation and style.presentation not in (presentation, "any"):
            continue
        if protective_only and not style.protective:
            continue
        if max_minutes is not None and style.styling_minutes > max_minutes:
            continue

        score = 0.0
        reasons: list[str] = []

        if face_shape and face_shape in style.suits_shapes:
            score += 3.0
            reasons.append(f"Often recommended for a {face_shape.replace('_', ' ')} face shape.")
        elif face_shape and not style.suits_shapes:
            # Styles with no shape list (protective styles) suit broadly.
            score += 1.5
            reasons.append("Works across face shapes.")

        if texture:
            score += 1.0
            reasons.append(f"Cuts well on {texture} hair.")
        if maintenance and style.maintenance == maintenance:
            score += 0.75
        if style.maintenance == "low":
            score += 0.5
            reasons.append("Low upkeep between salon visits.")
        if max_minutes is not None:
            score += 0.5
            reasons.append(f"About {style.styling_minutes} minutes to style in the morning.")
        if style.protective:
            reasons.append("A protective style — low daily manipulation.")

        if not reasons:
            reasons.append(style.description)

        results.append({
            "key": style.key,
            "name": style.name,
            "length": style.length,
            "description": style.description,
            "textures": list(style.textures),
            "maintenance": style.maintenance,
            "stylingMinutes": style.styling_minutes,
            "presentation": style.presentation,
            "aesthetics": list(style.aesthetics),
            "origin": style.origin,
            "protective": style.protective,
            "notes": style.notes,
            "score": round(score, 2),
            "reasons": reasons,
        })

    results.sort(key=lambda r: (-r["score"], r["name"]))
    return results[:limit] if limit else results


def recommend_bangs(face_shape: str | None, *, texture: str | None = None) -> list[dict]:
    """Every fringe stays visible; the suited ones lead. "No fringe" always listed."""
    results = []
    for entry in BANGS:
        if texture and texture not in entry.textures:
            continue
        suited = bool(face_shape and face_shape in entry.suits_shapes)
        results.append({
            "key": entry.key,
            "name": entry.name,
            "description": entry.description,
            "textures": list(entry.textures),
            "maintenance": entry.maintenance,
            "notes": entry.notes,
            "suited": suited,
            "score": (2.0 if suited else 0.0) + (0.5 if entry.maintenance == "low" else 0.0),
        })
    results.sort(key=lambda r: (-r["score"], r["name"]))
    return results


def recommend_hair_colours(
    season: str | None,
    *,
    max_lift: str | None = None,
    family: str | None = None,
) -> list[dict]:
    """Order the colour library against the season the colour engine found."""
    season_data = SEASONS.get(season) if season else None
    wanted_warmth = _FAMILY_WARMTH.get(season_data["family"]) if season_data else None
    depth = season_data["depth"] if season_data else None

    results = []
    for colour in HAIR_COLOURS:
        if family and colour.family != family:
            continue
        if max_lift and _LIFT_RANK[colour.lift_required] > _LIFT_RANK.get(max_lift, 3):
            continue

        score = 0.0
        reasons: list[str] = []
        matches = False

        if wanted_warmth:
            if colour.warmth == wanted_warmth:
                score += 3.0
                matches = True
                reasons.append(
                    f"{colour.warmth.capitalize()} tone, which sits with your "
                    f"{season_data['label']} colouring."
                )
            elif colour.warmth == "neutral":
                score += 1.5
                matches = True
                reasons.append("Neutral tone — reads well across seasons.")

        if depth == "deep" and colour.family in ("black", "brown"):
            score += 1.0
            reasons.append("Depth close to your own colouring, so regrowth stays soft.")
        if depth == "light" and colour.family in ("blonde", "brown"):
            score += 1.0

        if colour.lift_required in ("none", "low"):
            score += 0.75
            reasons.append("Little or no lightening needed.")
        elif colour.lift_required == "high":
            reasons.append("Needs significant lightening — usually more than one session.")

        if not reasons:
            reasons.append(colour.notes)

        results.append({
            "key": colour.key,
            "name": colour.name,
            "hex": colour.hex,
            "family": colour.family,
            "warmth": colour.warmth,
            "liftRequired": colour.lift_required,
            "maintenance": colour.maintenance,
            "notes": colour.notes,
            "seasonMatch": matches,
            "score": round(score, 2),
            "reasons": reasons,
        })

    results.sort(key=lambda r: (-r["score"], r["name"]))
    return results


def recommend_partings(face_shape: str | None) -> list[dict]:
    results = [
        {**parting, "suited": bool(face_shape and face_shape in parting["suits"])}
        for parting in PARTINGS
    ]
    results.sort(key=lambda r: (not r["suited"], r["name"]))
    return results


def salon_guide(style_key: str) -> dict | None:
    """What to say at the salon for one specific cut."""
    style = HAIRSTYLE_BY_KEY.get(style_key)
    if style is None:
        return None

    ask_for = [
        f'Ask for "{style.name}" by name, and bring a photo — the same words mean '
        "different cuts in different salons.",
        f"Say how you wear it day to day: about {style.styling_minutes} minutes, "
        f"{style.maintenance} upkeep.",
        f"Mention your texture ({', '.join(style.textures)}) and ask how the cut "
        "behaves as it grows out.",
    ]
    if style.suits_shapes:
        ask_for.append("Ask where the shortest piece will sit against your face.")
    if style.protective:
        ask_for.append("Ask for gentle tension at the hairline, and say so during the install.")

    watch_out = [
        style.notes,
        "If the stylist suggests a change, ask what they are seeing — they can "
        "see your hair, and this guide cannot.",
    ]

    return {
        "styleKey": style.key,
        "title": f"Asking for a {style.name}",
        "askFor": ask_for,
        "watchOut": watch_out,
        "maintenance": (
            f"{style.maintenance.capitalize()} maintenance, roughly "
            f"{style.styling_minutes} minutes a day."
        ),
        "disclaimer": VISUALISATION_DISCLAIMER,
    }


def colour_by_key(key: str):
    return HAIR_COLOUR_BY_KEY.get(key)
