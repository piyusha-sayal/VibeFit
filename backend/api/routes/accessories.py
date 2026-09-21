"""Accessories Explorer: glasses, earrings, necklines, metals, hair accessories."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from core.database import get_db
from models.user import User
from rules import accessories_rules
from rules.accessories_library import CATEGORIES
from services.face_service import studio_context

router = APIRouter(prefix="/accessories", tags=["accessories"])

NOTE = (
    "Shape guidance is a stylist convention, not a rule. Everything stays "
    "listed — accessories are the cheapest thing in styling to simply try."
)


@router.get("")
async def all_accessories(
    face_shape: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    context = await studio_context(db, current_user.id)
    shape = face_shape or context["faceShape"]
    bundle = accessories_rules.all_categories(
        shape, undertone=context["undertone"], season_family=context["seasonFamily"],
    )
    return {**bundle, "note": NOTE}


@router.get("/{category}")
async def by_category(
    category: str,
    face_shape: str | None = None,
    origin: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if category not in CATEGORIES:
        raise HTTPException(status_code=404, detail="Unknown category")

    context = await studio_context(db, current_user.id)
    shape = face_shape or context["faceShape"]

    if category == "metals":
        items = accessories_rules.recommend_metals(
            context["undertone"], season_family=context["seasonFamily"])
    else:
        items = accessories_rules.recommend(category, shape, origin=origin)

    return {"category": category, "faceShape": shape, "items": items, "note": NOTE}
