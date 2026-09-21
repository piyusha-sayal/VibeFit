"""Outfit recommendations and clothing colour pairings.

Every input is optional. A user with no colour analysis, no body type and no
aesthetics still gets useful outfits — they are simply ordered by less.

Body type changes the *explanation* and the order. It never removes a garment
from the list, and no combination is described as unflattering.
"""
from __future__ import annotations

from rules.color_palettes import SEASONS
from rules.fashion_library import (
    BODY_TYPES, GARMENT_BY_KEY, GARMENTS, Garment,
)
from rules.style_aesthetics import AESTHETIC_BY_KEY

# What the eye is doing for each self-selected shape. Phrased as an effect, not
# a correction: nothing here says a body needs fixing.
BODY_NOTES: dict[str, str] = {
    "pear": "Volume or structure up top sits opposite the hip line.",
    "apple": "An unbroken vertical line through the middle, with the waist wherever you like it.",
    "hourglass": "A marked waist, if you want it marked — these shapes follow the line you have.",
    "rectangle": "Layers and belts create a waist where the cut does not.",
    "inverted_triangle": "Volume below balances a strong shoulder line.",
    "unsure": "Chosen for fit and comfort rather than shape — a good place to start.",
    "uncategorised": "Chosen from your own preferences, not from a shape category.",
}

FORMALITY_BY_OCCASION = {
    "everyday": ("casual", "smart_casual"),
    "college": ("casual", "smart_casual"),
    "office": ("business", "smart_casual"),
    "work": ("business", "smart_casual"),
    "interview": ("business", "formal"),
    "date": ("smart_casual", "occasion"),
    "party": ("smart_casual", "occasion"),
    "evening": ("smart_casual", "occasion"),
    "wedding": ("occasion", "formal"),
    "indian_wedding": ("occasion", "formal"),
    "festival": ("occasion", "smart_casual"),
    "vacation": ("casual", "smart_casual"),
}


def _matches_occasion(garment: Garment, occasion: str | None) -> bool:
    if not occasion:
        return True
    if occasion in garment.occasions:
        return True
    return garment.formality in FORMALITY_BY_OCCASION.get(occasion, ())


def _matches_climate(garment: Garment, climate: str | None) -> bool:
    if not climate:
        return True
    return "any" in garment.climates or climate in garment.climates


def score_garment(
    garment: Garment,
    *,
    body_type: str | None = None,
    aesthetics: list[str] | None = None,
    silhouettes: list[str] | None = None,
    fit_preference: str | None = None,
    occasion: str | None = None,
    climate: str | None = None,
    cultural: list[str] | None = None,
) -> tuple[float, list[str]]:
    score = 0.0
    reasons: list[str] = []

    if body_type and body_type in garment.suits_shapes:
        score += 2.5
        reasons.append(BODY_NOTES.get(body_type, ""))
    if aesthetics:
        overlap = [a for a in garment.aesthetics
                   if a.lower().replace(' ', '_').replace('-', '_')
                   in {x.lower().replace(' ', '_').replace('-', '_') for x in aesthetics}]
        if overlap:
            score += 2.0 * len(overlap)
            reasons.append(f"Fits your {overlap[0]} leaning.")
    if silhouettes and garment.silhouette in [s.lower().replace('-', '_') for s in silhouettes]:
        score += 1.5
        reasons.append(f"A {garment.silhouette.replace('_', ' ')} shape, which you said you like.")
    if fit_preference and garment.fit == fit_preference.lower().replace('-', '_'):
        score += 1.0
        reasons.append(f"Cut {garment.fit.replace('_', ' ')}, the fit you prefer.")
    if occasion and occasion in garment.occasions:
        score += 1.5
        reasons.append(f"Worn for {occasion.replace('_', ' ')}.")
    if climate and climate in garment.climates:
        score += 1.0
        reasons.append(f"Works in {climate} weather.")
    if cultural:
        wanted = {c.lower() for c in cultural}
        if garment.region in wanted or (garment.region == "both" and wanted):
            score += 1.0

    reasons = [r for r in reasons if r]
    if not reasons:
        reasons.append(garment.description)
    return score, reasons


def serialise_garment(garment: Garment, score: float = 0.0, reasons: list[str] | None = None) -> dict:
    return {
        "key": garment.key,
        "name": garment.name,
        "category": garment.category,
        "region": garment.region,
        "description": garment.description,
        "silhouette": garment.silhouette,
        "fit": garment.fit,
        "formality": garment.formality,
        "occasions": list(garment.occasions),
        "climates": list(garment.climates),
        "styling": list(garment.styling),
        "aesthetics": list(garment.aesthetics),
        "note": garment.note,
        "colourRole": garment.colour_role,
        "score": round(score, 2),
        "reasons": reasons or [],
    }


def recommend_garments(
    *,
    body_type: str | None = None,
    aesthetics: list[str] | None = None,
    silhouettes: list[str] | None = None,
    fit_preference: str | None = None,
    occasion: str | None = None,
    climate: str | None = None,
    cultural: list[str] | None = None,
    category: str | None = None,
    region: str | None = None,
    limit: int | None = None,
) -> list[dict]:
    """Rank the library. Category and region filter; everything else orders."""
    results = []
    for garment in GARMENTS:
        if category and garment.category != category:
            continue
        if region and garment.region not in (region, "both"):
            continue
        if not _matches_occasion(garment, occasion):
            continue
        if not _matches_climate(garment, climate):
            continue

        score, reasons = score_garment(
            garment, body_type=body_type, aesthetics=aesthetics, silhouettes=silhouettes,
            fit_preference=fit_preference, occasion=occasion, climate=climate, cultural=cultural,
        )
        results.append(serialise_garment(garment, score, reasons))

    results.sort(key=lambda r: (-r["score"], r["name"]))
    return results[:limit] if limit else results


# --------------------------------------------------------------- outfit concepts

OUTFIT_CONCEPTS = [
    # Each concept names the roles it needs; garments are chosen at request time
    # from the ranked library, so concepts stay small and never go stale.
    {"key": "tailored_day", "name": "Tailored day",
     "roles": ["trousers", "shirts", "blazers", "footwear"],
     "occasions": ["work", "office", "interview"], "formality": "business",
     "summary": "One structured layer over something simple."},
    {"key": "easy_everyday", "name": "Easy everyday",
     "roles": ["tops", "jeans", "footwear"],
     "occasions": ["everyday", "college", "vacation"], "formality": "casual",
     "summary": "Three pieces, no decisions."},
    {"key": "fluid_evening", "name": "Fluid evening",
     "roles": ["dresses", "footwear", "bags"],
     "occasions": ["evening", "party", "date"], "formality": "occasion",
     "summary": "One statement piece and very little else."},
    {"key": "festive_traditional", "name": "Festive traditional",
     "roles": ["traditional", "footwear", "accessories"],
     "occasions": ["festival", "wedding", "indian_wedding"], "formality": "occasion",
     "summary": "A full traditional set, styled end to end."},
    {"key": "indo_western_evening", "name": "Indo-Western evening",
     "roles": ["traditional", "jackets", "footwear"],
     "occasions": ["festival", "party", "evening"], "formality": "occasion",
     "summary": "Traditional fabric, contemporary shape."},
    {"key": "layered_smart", "name": "Layered smart",
     "roles": ["tops", "trousers", "outerwear", "bags"],
     "occasions": ["work", "everyday"], "formality": "smart_casual",
     "summary": "A long layer over a simple base."},
    {"key": "relaxed_set", "name": "Relaxed set",
     "roles": ["sets", "footwear"],
     "occasions": ["everyday", "vacation", "college"], "formality": "casual",
     "summary": "A matching set, which is one decision instead of three."},
    {"key": "skirt_day", "name": "Skirt and structure",
     "roles": ["tops", "skirts", "jackets", "footwear"],
     "occasions": ["work", "everyday", "date"], "formality": "smart_casual",
     "summary": "A defined waist with a softer hem."},
]


def _palette_for(season: str | None) -> dict:
    data = SEASONS.get(season) if season else None
    if not data:
        return {"season": None, "seasonLabel": None, "best": [], "neutrals": [], "accents": []}
    return {
        "season": season,
        "seasonLabel": data["label"],
        "best": list(data["best"]),
        "neutrals": list(data["neutrals"]),
        "accents": list(data["accents"]),
    }


def build_outfits(
    *,
    occasion: str | None = None,
    body_type: str | None = None,
    aesthetics: list[str] | None = None,
    silhouettes: list[str] | None = None,
    fit_preference: str | None = None,
    climate: str | None = None,
    cultural: list[str] | None = None,
    season: str | None = None,
    limit: int = 6,
) -> list[dict]:
    """Assemble outfit concepts from the ranked library.

    A concept is only returned when every role it needs can actually be filled,
    so the UI never renders an outfit with a missing piece.
    """
    palette = _palette_for(season)
    # Concepts tagged for the occasion lead; anything at the right formality
    # follows, so a wedding does not return a single option.
    if occasion:
        wanted_formality = FORMALITY_BY_OCCASION.get(occasion, ())
        concepts = [c for c in OUTFIT_CONCEPTS if occasion in c["occasions"]]
        concepts += [c for c in OUTFIT_CONCEPTS
                     if c not in concepts and c["formality"] in wanted_formality]
    else:
        concepts = list(OUTFIT_CONCEPTS)
    concepts = concepts or list(OUTFIT_CONCEPTS)

    outfits = []
    for concept in concepts:
        pieces = []
        total = 0.0
        for role in concept["roles"]:
            ranked = recommend_garments(
                body_type=body_type, aesthetics=aesthetics, silhouettes=silhouettes,
                fit_preference=fit_preference, occasion=occasion, climate=climate,
                cultural=cultural, category=role, limit=2,
            )
            if not ranked:
                pieces = []
                break
            pieces.append(ranked[0])
            total += ranked[0]["score"]

        if not pieces:
            continue

        why = [r for piece in pieces for r in piece["reasons"][:1]]
        alternatives = []
        for role in concept["roles"][:2]:
            options = recommend_garments(
                body_type=body_type, aesthetics=aesthetics, occasion=occasion,
                climate=climate, category=role, limit=3,
            )
            if len(options) > 1:
                alternatives.append({"role": role, "swapFor": options[1]["name"],
                                     "key": options[1]["key"]})

        outfits.append({
            "key": concept["key"],
            "name": concept["name"],
            "summary": concept["summary"],
            "occasion": occasion,
            "formality": concept["formality"],
            "pieces": pieces,
            "colours": {
                "season": palette["season"],
                "seasonLabel": palette["seasonLabel"],
                "main": palette["best"][:3],
                "neutral": palette["neutrals"][:2],
                "accent": palette["accents"][:1],
            },
            "why": list(dict.fromkeys(why))[:3],
            "accessories": [
                serialise_garment(GARMENT_BY_KEY[k])
                for k in ("belt", "silk_scarf", "dupatta")
                if k in GARMENT_BY_KEY and k not in {p["key"] for p in pieces}
            ][:2],
            "alternatives": alternatives,
            "score": round(total, 2),
        })

    outfits.sort(key=lambda o: (-o["score"], o["name"]))
    return outfits[:limit]


def valid_body_type(value: str | None) -> bool:
    return value in BODY_TYPES


def aesthetic_exists(key: str) -> bool:
    return key in AESTHETIC_BY_KEY
