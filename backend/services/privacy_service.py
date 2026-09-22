"""Account deletion, data export and photograph removal.

Three things a person is entitled to do with their own data, kept together
because they share one hard problem: the database is not the only place their
data lives. Deleting a user row cascades through every table, but it does not
reach into object storage, so every path here collects photograph URLs first
and removes the objects explicitly.

Everything is scoped to one user id, and that id always comes from the
authenticated session rather than from a request body.
"""
import logging
from datetime import datetime, timezone

from sqlalchemy import delete as sa_delete
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models.analysis import Analysis, ChatMessage, ChatSession, Recommendation
from models.beauty import (BeautyActivity, BeautyGoal, BeautyProfile,
                           CollectionItem, GuideProgress, LookCollection,
                           LookDraft, LookFeedback, SavedLook, UserSettings)
from models.profile import (ActionFeedback, OnboardingResponse, PlanAction,
                            ProfileCorrection)
from models.user import User
from services import photo_storage

logger = logging.getLogger("vibefit.privacy")

# Typing this exactly is the point of the confirmation step: it cannot be
# produced by a stray tap, and it says what it does.
DELETE_CONFIRMATION = "DELETE MY ACCOUNT"

# Stated to the user verbatim in the deletion dialog and in the privacy screen.
# Say only what the implementation actually does.
RETENTION_NOTE = (
    "Your account and everything in it is removed from the live database "
    "immediately, and stored photographs are deleted from object storage as "
    "part of the same request. Encrypted infrastructure backups are kept by "
    "our database and storage providers on their own rolling schedules and "
    "are not searchable per person; deleted data ages out of those backups "
    "rather than being removed from them individually."
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


# --------------------------------------------------------------- photographs

async def _analyses_for(db: AsyncSession, user_id: str) -> list[Analysis]:
    rows = await db.execute(
        select(Analysis).where(Analysis.user_id == user_id)
        .order_by(Analysis.created_at.desc()))
    return list(rows.scalars())


def photo_out(analysis: Analysis) -> dict:
    """What the photograph management screen shows about one scan.

    Never the URL itself. The screen needs to know a photograph exists and
    when it was taken, not where it is stored.
    """
    return {
        "analysisId": analysis.id,
        "createdAt": analysis.created_at.isoformat() if analysis.created_at else None,
        "status": analysis.status,
        "stored": photo_storage.is_stored(analysis.image_url),
        "deletedAt": (analysis.photo_deleted_at.isoformat()
                      if analysis.photo_deleted_at else None),
        "analysisKept": analysis.status == "complete",
    }


async def list_photos(db: AsyncSession, user_id: str) -> dict:
    analyses = await _analyses_for(db, user_id)
    photos = [photo_out(a) for a in analyses]
    return {
        "photos": photos,
        "storedCount": sum(1 for p in photos if p["stored"]),
        "retentionNote": RETENTION_NOTE,
    }


async def _forget_photo(db: AsyncSession, analysis: Analysis) -> bool:
    """Delete the object and record that we did. Returns True if one went."""
    removed = await photo_storage.delete(analysis.image_url)
    if photo_storage.is_stored(analysis.image_url):
        # Record the intent even when the object store refused: the reference
        # is gone from our side either way, and leaving the URL would let a
        # later request hand it back out.
        analysis.photo_deleted_at = _now()
    analysis.image_url = None
    return removed


async def delete_photo(db: AsyncSession, user_id: str,
                       analysis_id: str) -> dict | None:
    """Remove one photograph, keeping the analysis and its results."""
    analysis = await db.get(Analysis, analysis_id)
    if analysis is None or analysis.user_id != user_id:
        return None
    removed = await _forget_photo(db, analysis)
    await db.flush()
    return {"photo": photo_out(analysis), "objectRemoved": removed}


async def delete_all_photos(db: AsyncSession, user_id: str) -> dict:
    analyses = await _analyses_for(db, user_id)
    removed = 0
    for analysis in analyses:
        if await _forget_photo(db, analysis):
            removed += 1
    await db.flush()
    return {"requested": len(analyses), "objectsRemoved": removed,
            "retentionNote": RETENTION_NOTE}


# ------------------------------------------------------------------ consent

CONSENT_FIELDS = ("photo_retention_consent", "photo_reuse_consent")


async def _settings_for(db: AsyncSession, user_id: str) -> UserSettings:
    row = await db.get(UserSettings, user_id)
    if row is None:
        row = UserSettings(user_id=user_id)
        db.add(row)
        await db.flush()
    return row


def consent_out(row: UserSettings) -> dict:
    return {
        "photoRetentionConsent": row.photo_retention_consent,
        "photoReuseConsent": row.photo_reuse_consent,
        "retentionNote": RETENTION_NOTE,
    }


async def get_consent(db: AsyncSession, user_id: str) -> dict:
    return consent_out(await _settings_for(db, user_id))


async def set_consent(db: AsyncSession, user_id: str, *,
                      retention: bool | None = None,
                      reuse: bool | None = None) -> dict:
    """Update consent, and act on a withdrawal rather than only recording it.

    Withdrawing retention consent is a request to stop keeping photographs, so
    the ones already kept are deleted now. Recording the flag and leaving the
    files in place would be the kind of consent control that is true on the
    screen and false in the bucket.
    """
    row = await _settings_for(db, user_id)
    withdrew_retention = retention is False and row.photo_retention_consent
    if retention is not None:
        row.photo_retention_consent = retention
    if reuse is not None:
        # Reuse cannot outlive retention: there would be nothing to reuse.
        row.photo_reuse_consent = reuse and row.photo_retention_consent
    if withdrew_retention:
        await delete_all_photos(db, user_id)
        row.photo_reuse_consent = False
    await db.flush()
    return consent_out(row)


# ------------------------------------------------------------------- export

def _iso(value) -> str | None:
    return value.isoformat() if isinstance(value, datetime) else None


async def _rows(db: AsyncSession, model, user_id: str) -> list:
    result = await db.execute(select(model).where(model.user_id == user_id))
    return list(result.scalars())


def _plain(row, *, drop: tuple[str, ...] = ()) -> dict:
    """A model row as JSON, with named columns left out.

    Column-driven rather than hand-written so a column added later is exported
    rather than silently missing — with the exception of the drop list, which
    is what keeps password hashes out.
    """
    out = {}
    for column in row.__table__.columns:
        if column.name in drop:
            continue
        value = getattr(row, column.name)
        out[column.name] = _iso(value) if isinstance(value, datetime) else value
    return out


# Never leaves the server, whatever else is added to these tables later.
NEVER_EXPORT = ("hashed_password",)


async def export_user_data(db: AsyncSession, user_id: str) -> dict:
    """Everything this account holds, as one JSON document.

    Photographs are named, not embedded: the export says which scans have a
    stored photograph, and the photograph screen is where they are managed.
    """
    user = await db.get(User, user_id)
    if user is None:
        return {}

    analyses = await _analyses_for(db, user_id)
    analysis_ids = [a.id for a in analyses]
    recommendations = []
    if analysis_ids:
        rows = await db.execute(select(Recommendation)
                                .where(Recommendation.analysis_id.in_(analysis_ids)))
        recommendations = [_plain(r) for r in rows.scalars()]

    sessions = await _rows(db, ChatSession, user_id)
    messages = []
    if sessions:
        rows = await db.execute(select(ChatMessage).where(
            ChatMessage.session_id.in_([s.id for s in sessions])))
        messages = [_plain(m) for m in rows.scalars()]

    collections = await _rows(db, LookCollection, user_id)
    items = []
    if collections:
        rows = await db.execute(select(CollectionItem).where(
            CollectionItem.collection_id.in_([c.id for c in collections])))
        items = [_plain(i) for i in rows.scalars()]

    plan_actions = await _rows(db, PlanAction, user_id)
    profile = await db.get(BeautyProfile, user_id)
    settings_row = await db.get(UserSettings, user_id)
    onboarding = await db.execute(
        select(OnboardingResponse).where(OnboardingResponse.user_id == user_id))

    return {
        "exportedAt": _now().isoformat(),
        "format": "MyLookFit account export v1",
        "note": ("Everything MyLookFit holds for this account. Photographs are "
                 "listed rather than embedded — manage them under Privacy → "
                 "Photographs."),
        "account": _plain(user, drop=NEVER_EXPORT),
        "settings": _plain(settings_row) if settings_row else None,
        "beautyProfile": _plain(profile) if profile else None,
        "onboarding": [_plain(o) for o in onboarding.scalars()],
        "analyses": [
            {**_plain(a, drop=("image_url",)),
             "photographStored": photo_storage.is_stored(a.image_url)}
            for a in analyses],
        "recommendations": recommendations,
        "savedLooks": [_plain(r) for r in await _rows(db, SavedLook, user_id)],
        "lookDrafts": [_plain(r) for r in await _rows(db, LookDraft, user_id)],
        "lookFeedback": [_plain(r) for r in await _rows(db, LookFeedback, user_id)],
        "collections": [_plain(c) for c in collections],
        "collectionItems": items,
        "beautyGoals": [_plain(r) for r in await _rows(db, BeautyGoal, user_id)],
        "beautyJourney": [_plain(r) for r in await _rows(db, BeautyActivity, user_id)],
        "guideProgress": [_plain(r) for r in await _rows(db, GuideProgress, user_id)],
        "profileCorrections": [_plain(r) for r in
                               await _rows(db, ProfileCorrection, user_id)],
        "planActions": [_plain(r) for r in plan_actions],
        "actionFeedback": [_plain(r) for r in await _rows(db, ActionFeedback, user_id)],
        "chatSessions": [_plain(s) for s in sessions],
        "chatMessages": messages,
    }


# ----------------------------------------------------------------- deletion

async def delete_account(db: AsyncSession, user_id: str) -> dict:
    """Delete the account and everything belonging to it.

    Order matters. Photographs go first, while their rows still exist to name
    them; the user row goes last, and the database cascades take every other
    table with it. If object storage fails, the row deletion still proceeds —
    the alternative is an account the person cannot leave — and the count of
    objects that could not be removed is returned rather than hidden.
    """
    user = await db.get(User, user_id)
    if user is None:
        return {"deleted": False}

    analyses = await _analyses_for(db, user_id)
    attempted = sum(1 for a in analyses if photo_storage.is_stored(a.image_url))
    removed = 0
    for analysis in analyses:
        try:
            if await photo_storage.delete(analysis.image_url):
                removed += 1
        except Exception:
            logger.exception("photo delete failed during account deletion")

    # Explicit deletes before the user row: SQLite has no ON DELETE CASCADE
    # unless foreign keys are enabled per connection, and relying on that
    # difference between test and production is how orphans appear.
    await db.execute(sa_delete(ChatMessage).where(ChatMessage.session_id.in_(
        select(ChatSession.id).where(ChatSession.user_id == user_id))))
    await db.execute(sa_delete(Recommendation).where(Recommendation.analysis_id.in_(
        select(Analysis.id).where(Analysis.user_id == user_id))))
    await db.execute(sa_delete(CollectionItem).where(CollectionItem.collection_id.in_(
        select(LookCollection.id).where(LookCollection.user_id == user_id))))
    await db.execute(sa_delete(ActionFeedback).where(
        ActionFeedback.user_id == user_id))
    for model in (ChatSession, LookCollection, SavedLook, LookDraft, LookFeedback,
                  BeautyGoal, BeautyActivity, GuideProgress, PlanAction,
                  ProfileCorrection, OnboardingResponse, Analysis,
                  BeautyProfile, UserSettings):
        await db.execute(sa_delete(model).where(model.user_id == user_id))
    await db.delete(user)
    await db.flush()

    return {
        "deleted": True,
        "photographsAttempted": attempted,
        "photographsRemoved": removed,
        "retentionNote": RETENTION_NOTE,
    }
