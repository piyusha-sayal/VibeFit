"""Discover My Style: profile, garments, aesthetics, outfits and colour pairings.

Saving an outfit reuses the Passport's SavedLook, so there is exactly one
saved-items system in the app.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field, field_validator
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from core.database import get_db
from models.beauty import BeautyProfile
from models.user import User
from rules import outfit_colors, outfit_rules, style_aesthetics
from rules.fashion_library import (
    BODY_TYPES, CATEGORIES, CLIMATES, FORMALITY, GARMENT_BY_KEY, REGIONS,
)
from services.passport_service import record_activity
from services.style_service import build_style_profile, get_profile, recommendation_inputs

router = APIRouter(prefix="/style", tags=["style"])

BODY_TYPE_NOTE = (
    "You choose this yourself, and you can skip it. MyLookFit never asks for a "
    "body photograph and never estimates body shape from an image. No body type "
    "is better than another."
)


class StyleProfileUpdate(BaseModel):
    """Every field optional: the questionnaire is answered a section at a time."""
    body_type: str | None = Field(default=None, alias="bodyType")
    height_cm: int | None = Field(default=None, alias="heightCm", ge=50, le=260)
    fit_preference: str | None = Field(default=None, alias="fitPreference", max_length=30)
    silhouette_preferences: list[str] | None = Field(default=None, alias="silhouettePreferences")
    neckline_preferences: list[str] | None = Field(default=None, alias="necklinePreferences")
    sleeve_preferences: list[str] | None = Field(default=None, alias="sleevePreferences")
    garment_preferences: dict | None = Field(default=None, alias="garmentPreferences")
    aesthetics: list[str] | None = None
    cultural_preferences: list[str] | None = Field(default=None, alias="culturalPreferences")
    sizes: dict | None = None
    favourite_occasions: list[str] | None = Field(default=None, alias="favouriteOccasions")
    comfort_notes: str | None = Field(default=None, alias="comfortNotes", max_length=2000)
    style_quiz: dict | None = Field(default=None, alias="styleQuiz")

    model_config = {"populate_by_name": True}

    @field_validator("body_type")
    @classmethod
    def _known_body_type(cls, value: str | None) -> str | None:
        if value is not None and value not in BODY_TYPES:
            raise ValueError(f"Unknown body type. One of: {', '.join(BODY_TYPES)}")
        return value

    @field_validator("aesthetics")
    @classmethod
    def _known_aesthetics(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        unknown = [k for k in value if not outfit_rules.aesthetic_exists(k)]
        if unknown:
            raise ValueError(f"Unknown aesthetic: {', '.join(unknown)}")
        return value


class QuizSubmission(BaseModel):
    answers: dict[str, list[str] | str] = Field(default_factory=dict)
    save: bool = True


@router.get("/profile")
async def get_style_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    profile = await build_style_profile(db, current_user.id)
    return {**profile, "bodyTypeNote": BODY_TYPE_NOTE}


@router.put("/profile")
async def update_style_profile(
    payload: StyleProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Partial upsert. Fields left out keep their stored value."""
    profile = await get_profile(db, current_user.id)
    if profile is None:
        profile = BeautyProfile(user_id=current_user.id)
        db.add(profile)

    changes = payload.model_dump(exclude_unset=True, by_alias=False)
    for field, value in changes.items():
        setattr(profile, field, value)

    if changes:
        await record_activity(db, current_user.id, "style_profile",
                              "Updated style preferences")
    await db.commit()

    result = await build_style_profile(db, current_user.id)
    return {**result, "bodyTypeNote": BODY_TYPE_NOTE}


@router.get("/options")
async def style_options():
    """Everything the questionnaire and filters need, so the client hardcodes nothing."""
    return {
        "bodyTypes": [
            {"key": key,
             "label": key.replace("_", " ").title() if key not in ("unsure", "uncategorised")
             else ("Not sure" if key == "unsure" else "Prefer not to categorise"),
             "skippable": True}
            for key in BODY_TYPES
        ],
        "bodyTypeNote": BODY_TYPE_NOTE,
        "categories": list(CATEGORIES),
        "regions": list(REGIONS),
        "climates": list(CLIMATES),
        "formality": list(FORMALITY),
        "aesthetics": [style_aesthetics.serialise(a) for a in style_aesthetics.AESTHETICS],
        "pairings": outfit_colors.PAIRINGS,
    }


@router.get("/garments")
async def list_garments(
    category: str | None = None,
    region: str | None = None,
    occasion: str | None = None,
    climate: str | None = None,
    aesthetic: str | None = None,
    limit: int | None = Query(default=None, ge=1, le=200),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if category and category not in CATEGORIES:
        raise HTTPException(status_code=404, detail="Unknown clothing category")
    if region and region not in REGIONS:
        raise HTTPException(status_code=404, detail="Unknown region")

    inputs = await recommendation_inputs(db, current_user.id)
    aesthetics = [aesthetic] if aesthetic else inputs["aesthetics"]

    garments = outfit_rules.recommend_garments(
        body_type=inputs["effectiveBodyType"],
        aesthetics=aesthetics,
        silhouettes=inputs["silhouettes"],
        fit_preference=inputs["fitPreference"],
        occasion=occasion,
        climate=climate or inputs["climate"],
        cultural=inputs["cultural"],
        category=category,
        region=region,
        limit=limit,
    )
    return {
        "count": len(garments),
        "garments": garments,
        "personalisedWith": {
            "bodyType": inputs["bodyType"],
            "aesthetics": aesthetics,
            "season": inputs["season"],
        },
    }


@router.get("/garments/{garment_key}")
async def get_garment(garment_key: str):
    garment = GARMENT_BY_KEY.get(garment_key)
    if garment is None:
        raise HTTPException(status_code=404, detail="Unknown garment")
    return outfit_rules.serialise_garment(garment)


@router.get("/aesthetics")
async def list_aesthetics():
    return {"aesthetics": [style_aesthetics.serialise(a) for a in style_aesthetics.AESTHETICS]}


@router.get("/quiz")
async def get_quiz():
    return {
        "questions": [
            {
                "key": q.key,
                "prompt": q.prompt,
                "helpText": q.help_text,
                "multi": q.multi,
                "options": [{"key": o.key, "label": o.label} for o in q.options],
            }
            for q in style_aesthetics.QUIZ
        ],
        "note": "Optional, and you can stop part-way — a half-finished quiz still ranks.",
    }


@router.post("/quiz")
async def submit_quiz(
    payload: QuizSubmission,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rank aesthetics from the answers. Saving is opt-in and never exclusive."""
    ranked = style_aesthetics.score_quiz(payload.answers)
    suggested = [r["key"] for r in ranked if r["score"] > 0][:3]

    if payload.save:
        profile = await get_profile(db, current_user.id)
        if profile is None:
            profile = BeautyProfile(user_id=current_user.id)
            db.add(profile)
        profile.style_quiz = payload.answers
        # The quiz suggests; it does not overwrite a choice already made.
        if not profile.aesthetics:
            profile.aesthetics = suggested
        await record_activity(db, current_user.id, "style_quiz", "Took the style quiz")
        await db.commit()

    return {
        "ranked": ranked,
        "suggested": suggested,
        "saved": payload.save,
        "note": "These are suggestions. Keep as many aesthetics as you like, or none.",
    }


@router.get("/outfits")
async def list_outfits(
    occasion: str | None = None,
    climate: str | None = None,
    limit: int = Query(default=6, ge=1, le=20),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Outfit concepts. Works with an empty profile — it just orders by less."""
    inputs = await recommendation_inputs(db, current_user.id)
    outfits = outfit_rules.build_outfits(
        occasion=occasion,
        body_type=inputs["effectiveBodyType"],
        aesthetics=inputs["aesthetics"],
        silhouettes=inputs["silhouettes"],
        fit_preference=inputs["fitPreference"],
        climate=climate or inputs["climate"],
        cultural=inputs["cultural"],
        season=inputs["season"],
        limit=limit,
    )
    missing = [
        key for key, present in (
            ("colour analysis", inputs["hasColourAnalysis"]),
            ("body type", bool(inputs["bodyType"])),
            ("aesthetics", bool(inputs["aesthetics"])),
        ) if not present
    ]
    return {
        "outfits": outfits,
        "count": len(outfits),
        "personalisedWith": {
            "bodyType": inputs["bodyType"],
            "aesthetics": inputs["aesthetics"],
            "season": inputs["season"],
            "seasonLabel": inputs["seasonLabel"],
            "climate": climate or inputs["climate"],
        },
        # Named, so the UI can offer to fill a gap instead of pretending there is none.
        "couldImproveWith": missing,
    }


@router.get("/colours")
async def outfit_colours(
    region: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    inputs = await recommendation_inputs(db, current_user.id)
    return outfit_colors.explore(inputs["season"], region)


@router.get("/colours/{pairing_key}")
async def outfit_colour_pairing(
    pairing_key: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    inputs = await recommendation_inputs(db, current_user.id)
    pairing = outfit_colors.pairing_suggestions(pairing_key, inputs["season"], limit=8)
    if pairing is None:
        raise HTTPException(status_code=404, detail="Unknown pairing")
    return pairing
