"""Guide progress: read, update, complete, resume.

Progress lives on the account so it survives a reinstall or a second device.
Every query and every write is scoped to the authenticated user — a slug in the
path never reaches another person's row.

Guide content itself stays in the app; only progress is stored here, so adding
a guide needs no backend change.
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.deps import get_current_user
from core.database import get_db
from models.beauty import GuideProgress
from models.user import User
from services.passport_service import record_activity

router = APIRouter(prefix="/guides", tags=["guides"])

SLUG_MAX = 80


class ProgressUpdate(BaseModel):
    saved: bool | None = None
    completed: bool | None = None
    last_step: int | None = Field(default=None, ge=0, le=500, alias="lastStep")

    model_config = {"populate_by_name": True}


class ProgressSync(BaseModel):
    """Device-local progress being merged in. Additive: nothing is cleared."""
    completed: list[str] = Field(default_factory=list, max_length=200)
    saved: list[str] = Field(default_factory=list, max_length=200)


def _serialise(row: GuideProgress) -> dict:
    return {
        "slug": row.guide_slug,
        "saved": row.saved,
        "completed": row.completed_at is not None,
        "completedAt": row.completed_at,
        "lastStep": row.last_step,
        "updatedAt": row.updated_at or row.created_at,
    }


async def _row_for(db: AsyncSession, user_id: str, slug: str) -> GuideProgress | None:
    result = await db.execute(
        select(GuideProgress).where(
            GuideProgress.user_id == user_id,
            GuideProgress.guide_slug == slug,
        )
    )
    return result.scalars().first()


def _validate_slug(slug: str) -> str:
    slug = slug.strip()
    if not slug or len(slug) > SLUG_MAX:
        raise HTTPException(status_code=422, detail="Invalid guide slug")
    return slug


@router.get("/progress")
async def list_progress(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(GuideProgress).where(GuideProgress.user_id == current_user.id)
    )
    rows = result.scalars().all()
    return {
        "progress": [_serialise(row) for row in rows],
        "completedCount": sum(1 for row in rows if row.completed_at),
        "savedCount": sum(1 for row in rows if row.saved),
    }


@router.get("/progress/{slug}")
async def get_progress(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    row = await _row_for(db, current_user.id, _validate_slug(slug))
    if row is None:
        # Not started is a normal state, not an error.
        return {"slug": slug, "saved": False, "completed": False,
                "completedAt": None, "lastStep": None, "updatedAt": None}
    return _serialise(row)


@router.put("/progress/{slug}")
async def update_progress(
    slug: str,
    payload: ProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Partial update. Fields left out keep their stored value."""
    slug = _validate_slug(slug)
    now = datetime.now(timezone.utc)
    row = await _row_for(db, current_user.id, slug)
    if row is None:
        row = GuideProgress(user_id=current_user.id, guide_slug=slug)
        db.add(row)

    was_complete = row.completed_at is not None
    if payload.saved is not None:
        row.saved = payload.saved
    if payload.last_step is not None:
        row.last_step = payload.last_step
    if payload.completed is not None:
        row.completed_at = now if payload.completed else None
    row.updated_at = now

    if payload.completed and not was_complete:
        await record_activity(db, current_user.id, "guide_completed",
                              f"Finished the {slug.replace('-', ' ')} guide", ref_id=slug)

    await db.commit()
    await db.refresh(row)
    return _serialise(row)


@router.post("/progress/{slug}/complete")
async def complete_guide(
    slug: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await update_progress(slug, ProgressUpdate(completed=True), current_user, db)


@router.post("/progress/sync")
async def sync_progress(
    payload: ProgressSync,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Merge progress a device recorded while offline or before sign-in.

    Additive by design: a guide the server knows is complete stays complete even
    if the device does not list it. Nothing is ever cleared by a sync.
    """
    now = datetime.now(timezone.utc)
    result = await db.execute(
        select(GuideProgress).where(GuideProgress.user_id == current_user.id)
    )
    existing = {row.guide_slug: row for row in result.scalars().all()}

    touched = 0
    for slug in {s.strip() for s in payload.completed if s and s.strip()}:
        if len(slug) > SLUG_MAX:
            continue
        row = existing.get(slug)
        if row is None:
            row = GuideProgress(user_id=current_user.id, guide_slug=slug)
            db.add(row)
            existing[slug] = row
        if row.completed_at is None:
            row.completed_at = now
            row.updated_at = now
            touched += 1

    for slug in {s.strip() for s in payload.saved if s and s.strip()}:
        if len(slug) > SLUG_MAX:
            continue
        row = existing.get(slug)
        if row is None:
            row = GuideProgress(user_id=current_user.id, guide_slug=slug)
            db.add(row)
            existing[slug] = row
        if not row.saved:
            row.saved = True
            row.updated_at = now
            touched += 1

    await db.commit()
    return {"merged": touched, "total": len(existing)}
