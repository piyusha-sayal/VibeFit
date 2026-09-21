"""Makeup Studio: aesthetics, the look builder and foundation guidance."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from core.database import get_db
from models.user import User
from rules import makeup_rules
from rules.makeup_library import INTENSITIES, OCCASIONS, TIME_BUDGETS
from services.face_service import studio_context

router = APIRouter(prefix="/makeup", tags=["makeup"])


@router.get("/options")
async def makeup_options():
    return {
        "occasions": list(OCCASIONS),
        "timeBudgets": list(TIME_BUDGETS),
        "intensities": list(INTENSITIES),
    }


@router.get("/aesthetics")
async def list_aesthetics(
    occasion: str | None = None,
    max_minutes: int | None = Query(default=None, ge=1, le=120),
    intensity: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    context = await studio_context(db, current_user.id)
    results = makeup_rules.recommend_aesthetics(
        occasion=occasion,
        max_minutes=max_minutes,
        intensity=intensity,
        contrast=context["contrast"],
    )
    return {
        "contrast": context["contrast"],
        "count": len(results),
        "aesthetics": results,
    }


@router.get("/looks/{aesthetic_key}")
async def build_look(
    aesthetic_key: str,
    occasion: str | None = None,
    season: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """One complete look, built from what the user has actually confirmed."""
    context = await studio_context(db, current_user.id)
    look = makeup_rules.build_look(
        aesthetic_key,
        season=season or context["season"],
        attributes=context["attributes"],
        occasion=occasion,
        undertone=context["undertone"],
    )
    if look is None:
        raise HTTPException(status_code=404, detail="Unknown aesthetic")
    return look
