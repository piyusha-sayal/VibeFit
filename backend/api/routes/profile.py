from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from core.database import get_db
from models.user import User
from models.profile import ProfileCorrection
from schemas.profile import OnboardingIn, OnboardingOut, VibeProfileOut, CorrectionIn, CorrectionOut
from services import profile_service
from api.deps import get_current_user

router = APIRouter(prefix="/profile", tags=["profile"])


@router.post("/onboarding", response_model=OnboardingOut, status_code=201)
async def save_onboarding(
    body: OnboardingIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Upsert: only fields present in the request are updated, so the app can
    save progress across multiple skippable steps."""
    data = body.model_dump(exclude_unset=True)
    onboarding = await profile_service.upsert_onboarding(db, current_user.id, data)
    return onboarding


@router.get("/onboarding", response_model=OnboardingOut)
async def get_onboarding(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    onboarding = await profile_service.get_onboarding(db, current_user.id)
    if onboarding is None:
        raise HTTPException(status_code=404, detail="Onboarding not started")
    return onboarding


@router.get("/vibe", response_model=VibeProfileOut)
async def get_vibe_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await profile_service.build_vibe_profile(db, current_user.id)


@router.post("/corrections", response_model=CorrectionOut, status_code=201)
async def create_correction(
    body: CorrectionIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    correction = await profile_service.save_correction(
        db, current_user.id, body.attribute_key, body.corrected_value, body.note)
    return correction


@router.get("/corrections", response_model=list[CorrectionOut])
async def list_corrections(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ProfileCorrection)
        .where(ProfileCorrection.user_id == current_user.id)
        .order_by(desc(ProfileCorrection.created_at))
    )
    return list(result.scalars().all())
