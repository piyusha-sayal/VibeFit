"""Hair Studio: haircuts, bangs, colour, parting and the salon guide.

Defaults come from the shared face profile; every filter can be overridden by
the caller, because the user knows their own hair better than a scan does.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from core.database import get_db
from models.user import User
from rules import hair_rules
from rules.hair_library import LENGTHS, MAINTENANCE, PRESENTATIONS, TEXTURES
from services.face_service import studio_context

router = APIRouter(prefix="/hair", tags=["hair"])


@router.get("/options")
async def hair_options():
    """Everything the filter UI needs, so the client hardcodes nothing."""
    return {
        "lengths": list(LENGTHS),
        "textures": list(TEXTURES),
        "maintenance": list(MAINTENANCE),
        "presentations": list(PRESENTATIONS),
        "disclaimer": hair_rules.VISUALISATION_DISCLAIMER,
    }


@router.get("/styles")
async def list_styles(
    texture: str | None = None,
    length: str | None = None,
    maintenance: str | None = None,
    presentation: str | None = None,
    protective_only: bool = False,
    max_minutes: int | None = Query(default=None, ge=1, le=120),
    face_shape: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    context = await studio_context(db, current_user.id)
    shape = face_shape or context["faceShape"]
    # Presentation is only ever applied when stated — never inferred from a photo.
    presentation = presentation or context["genderPresentation"]

    results = hair_rules.recommend_hairstyles(
        shape,
        texture=texture or context["hairTexture"],
        length=length,
        maintenance=maintenance,
        presentation=presentation if presentation in PRESENTATIONS else None,
        protective_only=protective_only,
        max_minutes=max_minutes,
    )
    return {
        "faceShape": shape,
        "appliedTexture": texture or context["hairTexture"],
        "count": len(results),
        "styles": results,
        "disclaimer": hair_rules.VISUALISATION_DISCLAIMER,
    }


@router.get("/bangs")
async def list_bangs(
    texture: str | None = None,
    face_shape: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    context = await studio_context(db, current_user.id)
    shape = face_shape or context["faceShape"]
    return {
        "faceShape": shape,
        "bangs": hair_rules.recommend_bangs(shape, texture=texture or context["hairTexture"]),
        "disclaimer": hair_rules.VISUALISATION_DISCLAIMER,
    }


@router.get("/colours")
async def list_colours(
    season: str | None = None,
    max_lift: str | None = None,
    family: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Hair colour, ranked against the season the colour engine already found."""
    context = await studio_context(db, current_user.id)
    active = season or context["season"]
    return {
        "season": active,
        "seasonLabel": context["seasonLabel"] if active == context["season"] else None,
        "colours": hair_rules.recommend_hair_colours(active, max_lift=max_lift, family=family),
    }


@router.get("/partings")
async def list_partings(
    face_shape: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    context = await studio_context(db, current_user.id)
    shape = face_shape or context["faceShape"]
    return {"faceShape": shape, "partings": hair_rules.recommend_partings(shape)}


@router.get("/salon-guide/{style_key}")
async def salon_guide(style_key: str, current_user: User = Depends(get_current_user)):
    guide = hair_rules.salon_guide(style_key)
    if guide is None:
        raise HTTPException(status_code=404, detail="Unknown hairstyle")
    return guide
