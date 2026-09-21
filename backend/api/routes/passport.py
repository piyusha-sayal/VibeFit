from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import delete, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from core.database import get_db
from models.beauty import BeautyGoal, BeautyProfile, SavedLook, UserSettings
from models.user import User
from services.passport_service import build_passport, record_activity

router = APIRouter(prefix="/passport", tags=["passport"])

LOOK_KINDS = {"hair", "makeup", "outfit", "colour", "complete"}
LOOK_STATUSES = {"saved", "want_to_try", "tried"}
BODY_TYPES = {"pear", "apple", "hourglass", "rectangle", "inverted_triangle", "unsure", "uncategorised"}
THEMES = {"system", "light", "dark"}


class BeautyProfileIn(BaseModel):
    body_type: str | None = None
    height_cm: int | None = Field(default=None, ge=80, le=250)
    fit_preference: str | None = None
    neckline_preferences: list[str] | None = None
    sleeve_preferences: list[str] | None = None
    silhouette_preferences: list[str] | None = None
    aesthetics: list[str] | None = None
    cultural_preferences: list[str] | None = None
    favourite_occasions: list[str] | None = None
    hair_length: str | None = None
    hair_density: str | None = None
    makeup_experience: str | None = None


class SavedLookIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    kind: str
    status: str = "saved"
    occasion: str | None = None
    payload: dict | None = None
    source_analysis_id: str | None = None
    notes: str | None = None


class SavedLookPatch(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    status: str | None = None
    notes: str | None = None


class GoalIn(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    detail: str | None = None
    target_date: datetime | None = None


class GoalPatch(BaseModel):
    status: str | None = None
    title: str | None = Field(default=None, min_length=1, max_length=160)
    detail: str | None = None


class SettingsIn(BaseModel):
    theme: str | None = None
    reduced_motion: bool | None = None
    country: str | None = None
    language: str | None = None
    photo_reuse_consent: bool | None = None


def _look_out(look: SavedLook) -> dict:
    return {
        "id": look.id, "name": look.name, "kind": look.kind, "status": look.status,
        "occasion": look.occasion, "payload": look.payload, "notes": look.notes,
        "sourceAnalysisId": look.source_analysis_id,
        "createdAt": look.created_at, "updatedAt": look.updated_at,
    }


@router.get("")
async def get_passport(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await build_passport(db, current_user.id)


@router.get("/profile")
async def get_beauty_profile(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    profile = (await db.execute(
        select(BeautyProfile).where(BeautyProfile.user_id == current_user.id)
    )).scalars().first()
    if not profile:
        raise HTTPException(status_code=404, detail="No styling profile yet")
    return profile


@router.put("/profile")
async def upsert_beauty_profile(
    body: BeautyProfileIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Partial upsert: the questionnaire is skippable at every step."""
    data = body.model_dump(exclude_unset=True)
    if data.get("body_type") and data["body_type"] not in BODY_TYPES:
        raise HTTPException(status_code=422, detail="Unknown body type")

    profile = (await db.execute(
        select(BeautyProfile).where(BeautyProfile.user_id == current_user.id)
    )).scalars().first()
    created = profile is None
    if created:
        profile = BeautyProfile(user_id=current_user.id)
        db.add(profile)
    for key, value in data.items():
        setattr(profile, key, value)
    await db.flush()
    if created:
        await record_activity(db, current_user.id, "profile", "Started a styling profile")
    await db.commit()
    await db.refresh(profile)
    return profile


@router.get("/looks")
async def list_looks(
    kind: str | None = None,
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(SavedLook).where(SavedLook.user_id == current_user.id)
    if kind:
        query = query.where(SavedLook.kind == kind)
    if status:
        query = query.where(SavedLook.status == status)
    looks = (await db.execute(query.order_by(desc(SavedLook.created_at)))).scalars().all()
    return [_look_out(look) for look in looks]


@router.post("/looks", status_code=201)
async def save_look(
    body: SavedLookIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if body.kind not in LOOK_KINDS:
        raise HTTPException(status_code=422, detail="Unknown look kind")
    if body.status not in LOOK_STATUSES:
        raise HTTPException(status_code=422, detail="Unknown look status")

    look = SavedLook(user_id=current_user.id, **body.model_dump())
    db.add(look)
    await db.flush()
    await record_activity(db, current_user.id, "look_saved", f"Saved “{look.name}”", look.id)
    await db.commit()
    await db.refresh(look)
    return _look_out(look)


@router.patch("/looks/{look_id}")
async def update_look(
    look_id: str,
    body: SavedLookPatch,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    look = (await db.execute(
        select(SavedLook).where(SavedLook.id == look_id, SavedLook.user_id == current_user.id)
    )).scalars().first()
    if not look:
        raise HTTPException(status_code=404, detail="Look not found")

    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in LOOK_STATUSES:
        raise HTTPException(status_code=422, detail="Unknown look status")
    became_tried = data.get("status") == "tried" and look.status != "tried"
    for key, value in data.items():
        setattr(look, key, value)
    await db.flush()
    if became_tried:
        await record_activity(db, current_user.id, "look_tried", f"Tried “{look.name}”", look.id)
    await db.commit()
    await db.refresh(look)
    return _look_out(look)


@router.delete("/looks/{look_id}", status_code=204)
async def delete_look(
    look_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        delete(SavedLook).where(SavedLook.id == look_id, SavedLook.user_id == current_user.id)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Look not found")
    await db.commit()


@router.get("/goals")
async def list_goals(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goals = (await db.execute(
        select(BeautyGoal)
        .where(BeautyGoal.user_id == current_user.id)
        .order_by(desc(BeautyGoal.created_at))
    )).scalars().all()
    return goals


@router.post("/goals", status_code=201)
async def create_goal(
    body: GoalIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = BeautyGoal(user_id=current_user.id, **body.model_dump())
    db.add(goal)
    await db.flush()
    await record_activity(db, current_user.id, "goal", f"Set a goal: {goal.title}", goal.id)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.patch("/goals/{goal_id}")
async def update_goal(
    goal_id: str,
    body: GoalPatch,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    goal = (await db.execute(
        select(BeautyGoal).where(BeautyGoal.id == goal_id, BeautyGoal.user_id == current_user.id)
    )).scalars().first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    data = body.model_dump(exclude_unset=True)
    if "status" in data and data["status"] not in {"active", "done", "dropped"}:
        raise HTTPException(status_code=422, detail="Unknown goal status")
    completing = data.get("status") == "done" and goal.status != "done"
    for key, value in data.items():
        setattr(goal, key, value)
    if completing:
        goal.completed_at = datetime.now(timezone.utc)
        await db.flush()
        await record_activity(db, current_user.id, "goal", f"Completed: {goal.title}", goal.id)
    await db.commit()
    await db.refresh(goal)
    return goal


@router.get("/settings")
async def get_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Settings always exist from the app's point of view; defaults are real."""
    settings = (await db.execute(
        select(UserSettings).where(UserSettings.user_id == current_user.id)
    )).scalars().first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.patch("/settings")
async def update_settings(
    body: SettingsIn,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    data = body.model_dump(exclude_unset=True)
    if "theme" in data and data["theme"] not in THEMES:
        raise HTTPException(status_code=422, detail="Unknown theme")

    settings = (await db.execute(
        select(UserSettings).where(UserSettings.user_id == current_user.id)
    )).scalars().first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
    for key, value in data.items():
        setattr(settings, key, value)
    await db.commit()
    await db.refresh(settings)
    return settings
