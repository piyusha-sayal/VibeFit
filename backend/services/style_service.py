"""The shared style profile behind Discover My Style.

One source of truth. Body type, fit, necklines, sleeves, silhouettes,
aesthetics and cultural preferences live on `beauty_profiles`, where the
Passport already reads them. Climate, budget and modesty live on
`onboarding_responses`, where they were already collected. Nothing is copied
between the two.

The profile is read the same way whether a user answered everything or
nothing: missing fields are reported as missing, with the action that fills
them, and every downstream engine treats them as optional.
"""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.beauty import BeautyProfile
from models.profile import OnboardingResponse
from rules.fashion_library import BODY_TYPES
from rules.style_aesthetics import AESTHETIC_BY_KEY

# Questionnaire sections, in the order they are offered. Progressive
# disclosure: a user can answer one section and leave, and the profile is
# valid at every point in between.
SECTIONS = (
    {"key": "body", "label": "Body styling",
     "intro": "Self-selected, and skippable. We never estimate this from a photo.",
     "fields": ["bodyType", "heightCm"]},
    {"key": "fit", "label": "Fit and silhouette",
     "intro": "How you like clothes to sit.",
     "fields": ["fitPreference", "silhouettePreferences"]},
    {"key": "details", "label": "Necklines and sleeves",
     "intro": "The details you reach for.",
     "fields": ["necklinePreferences", "sleevePreferences"]},
    {"key": "garments", "label": "Garments",
     "intro": "Trousers, skirts, dresses, traditional wear — what you actually wear.",
     "fields": ["garmentPreferences"]},
    {"key": "aesthetics", "label": "Fashion aesthetics",
     "intro": "Pick as many as fit. Nobody is one aesthetic.",
     "fields": ["aesthetics", "culturalPreferences"]},
    {"key": "practical", "label": "Practical",
     "intro": "Sizes, occasions and anything about comfort.",
     "fields": ["sizes", "favouriteOccasions", "comfortNotes"]},
)

# Field -> the action that fills it. Shown instead of a placeholder value.
_ACTIONS = {
    "bodyType": "Choose a body type, or skip it",
    "heightCm": "Add your height, if you want to",
    "fitPreference": "Tell us how you like clothes to fit",
    "silhouettePreferences": "Pick the silhouettes you like",
    "necklinePreferences": "Pick your necklines",
    "sleevePreferences": "Pick your sleeves",
    "garmentPreferences": "Tell us which garments you wear",
    "aesthetics": "Choose your fashion aesthetics",
    "culturalPreferences": "Tell us which clothing traditions you wear",
    "sizes": "Add your sizes",
    "favouriteOccasions": "Tell us what you dress for",
    "comfortNotes": "Anything else about comfort",
}


async def get_profile(db: AsyncSession, user_id: str) -> BeautyProfile | None:
    result = await db.execute(
        select(BeautyProfile).where(BeautyProfile.user_id == user_id)
    )
    return result.scalars().first()


async def get_onboarding(db: AsyncSession, user_id: str) -> OnboardingResponse | None:
    result = await db.execute(
        select(OnboardingResponse).where(OnboardingResponse.user_id == user_id)
    )
    return result.scalars().first()


def _value_of(profile: BeautyProfile | None, field: str):
    if profile is None:
        return None
    mapping = {
        "bodyType": profile.body_type,
        "heightCm": profile.height_cm,
        "fitPreference": profile.fit_preference,
        "silhouettePreferences": profile.silhouette_preferences,
        "necklinePreferences": profile.neckline_preferences,
        "sleevePreferences": profile.sleeve_preferences,
        "garmentPreferences": profile.garment_preferences,
        "aesthetics": profile.aesthetics,
        "culturalPreferences": profile.cultural_preferences,
        "sizes": profile.sizes,
        "favouriteOccasions": profile.favourite_occasions,
        "comfortNotes": profile.comfort_notes,
    }
    return mapping.get(field)


def _is_answered(value) -> bool:
    if value is None:
        return False
    if isinstance(value, (list, dict, str)):
        return len(value) > 0
    return True


async def build_style_profile(db: AsyncSession, user_id: str) -> dict:
    """Everything Discover My Style needs, with gaps named rather than filled."""
    profile = await get_profile(db, user_id)
    onboarding = await get_onboarding(db, user_id)

    sections = []
    answered_total = 0
    field_total = 0
    for section in SECTIONS:
        fields = []
        for field in section["fields"]:
            value = _value_of(profile, field)
            answered = _is_answered(value)
            answered_total += int(answered)
            field_total += 1
            fields.append({
                "key": field,
                "value": value,
                "answered": answered,
                "action": None if answered else _ACTIONS.get(field),
            })
        sections.append({
            "key": section["key"],
            "label": section["label"],
            "intro": section["intro"],
            "complete": all(f["answered"] for f in fields),
            "fields": fields,
        })

    aesthetics = list(profile.aesthetics or []) if profile else []
    return {
        "bodyType": profile.body_type if profile else None,
        # Opting out is an answer, not a gap.
        "bodyTypeDeclined": (profile.body_type in ("unsure", "uncategorised")) if profile else False,
        "heightCm": profile.height_cm if profile else None,
        "fitPreference": profile.fit_preference if profile else None,
        "silhouettePreferences": (profile.silhouette_preferences or []) if profile else [],
        "necklinePreferences": (profile.neckline_preferences or []) if profile else [],
        "sleevePreferences": (profile.sleeve_preferences or []) if profile else [],
        "garmentPreferences": (profile.garment_preferences or {}) if profile else {},
        "aesthetics": aesthetics,
        "aestheticDetails": [
            {"key": key, "name": AESTHETIC_BY_KEY[key].name,
             "summary": AESTHETIC_BY_KEY[key].summary}
            for key in aesthetics if key in AESTHETIC_BY_KEY
        ],
        "culturalPreferences": (profile.cultural_preferences or []) if profile else [],
        "sizes": (profile.sizes or {}) if profile else {},
        "favouriteOccasions": (profile.favourite_occasions or []) if profile else [],
        "comfortNotes": profile.comfort_notes if profile else None,
        "styleQuiz": (profile.style_quiz or {}) if profile else {},
        # Read from onboarding, never copied into the style profile.
        "climate": onboarding.climate if onboarding else None,
        "budget": onboarding.budget_range if onboarding else None,
        "modesty": onboarding.modesty_preference if onboarding else None,
        "market": onboarding.market if onboarding else None,
        "sections": sections,
        "completion": round(answered_total / field_total, 2) if field_total else 0.0,
        "answered": answered_total,
        "total": field_total,
        "bodyTypes": list(BODY_TYPES),
    }


async def recommendation_inputs(db: AsyncSession, user_id: str) -> dict:
    """The subset the outfit engine consumes. Every value may be None."""
    from rules.color_season import build_color_report  # local import: avoids a cycle
    from services.face_service import latest_analysis

    profile = await get_profile(db, user_id)
    onboarding = await get_onboarding(db, user_id)
    analysis = await latest_analysis(db, user_id)
    colours = (analysis.color_analysis if analysis else None) or {}
    report = build_color_report(colours)

    body_type = profile.body_type if profile else None
    # "unsure" and "uncategorised" are explicit opt-outs: recommendations fall
    # back to stated preferences rather than a shape.
    effective_body = body_type if body_type not in (None, "unsure", "uncategorised") else None

    return {
        "bodyType": body_type,
        "effectiveBodyType": effective_body,
        "aesthetics": [
            AESTHETIC_BY_KEY[k].name for k in (profile.aesthetics or []) if k in AESTHETIC_BY_KEY
        ] if profile else [],
        "silhouettes": (profile.silhouette_preferences or []) if profile else [],
        "fitPreference": profile.fit_preference if profile else None,
        "cultural": (profile.cultural_preferences or []) if profile else [],
        "occasions": (profile.favourite_occasions or []) if profile else [],
        "climate": onboarding.climate if onboarding else None,
        "budget": onboarding.budget_range if onboarding else None,
        "season": report["season"] if report else None,
        "seasonLabel": report["label"] if report else None,
        "hasColourAnalysis": report is not None,
    }
