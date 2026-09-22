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
                           LookDraft, LookFeedback, PendingPhotoDeletion,
                           SavedLook, UserSettings)
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


async def _queue_orphan(db: AsyncSession, url: str | None, error: str) -> None:
    """Remember an object whose delete failed, so it is not lost with the row."""
    key = photo_storage.key_for(url)
    if key is None:
        return
    existing = await db.get(PendingPhotoDeletion, key)
    if existing is None:
        existing = PendingPhotoDeletion(object_key=key)
        db.add(existing)
    existing.attempts = (existing.attempts or 0) + 1
    existing.last_error = error[:200]
    existing.last_tried_at = _now()


async def sweep_pending_deletions(db: AsyncSession, *, limit: int = 25) -> dict:
    """Retry queued deletes; rows that succeed leave the queue.

    There is no scheduler on this plan, so this runs opportunistically from the
    privacy endpoints. A retry that fails stays queued with its attempt count
    raised, which is the difference between a backlog and a leak.
    """
    rows = await db.execute(
        select(PendingPhotoDeletion)
        .order_by(PendingPhotoDeletion.created_at).limit(limit))
    pending = list(rows.scalars())
    cleared = 0
    for row in pending:
        try:
            if await photo_storage.delete(photo_storage.public_url(row.object_key)):
                await db.delete(row)
                cleared += 1
                continue
            row.last_error = "delete returned false"
        except Exception as exc:
            row.last_error = type(exc).__name__[:200]
        row.attempts = (row.attempts or 0) + 1
        row.last_tried_at = _now()
    await db.flush()
    remaining = await db.execute(select(PendingPhotoDeletion))
    return {"retried": len(pending), "cleared": cleared,
            "stillPending": len(list(remaining.scalars()))}


async def _forget_photo(db: AsyncSession, analysis: Analysis) -> bool:
    """Delete the object and record that we did. Returns True if one went."""
    url = analysis.image_url
    removed = False
    error = "not stored"
    try:
        removed = await photo_storage.delete(url)
    except Exception as exc:
        error = type(exc).__name__
    if photo_storage.is_stored(url):
        # Record the intent even when the object store refused: the reference
        # is gone from our side either way, and leaving the URL would let a
        # later request hand it back out. The object is queued so that losing
        # the reference does not mean losing the file.
        analysis.photo_deleted_at = _now()
        if not removed:
            await _queue_orphan(db, url, error)
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


# An allowlist, not a denylist. A denylist exports every column nobody
# remembered to exclude, so the day someone adds `refresh_token` or
# `reset_token` to a table it ships to the user's device in a file they may
# then mail to themselves. Under an allowlist that column is simply absent
# until a person decides otherwise.
#
# `None` means "every column on this table" — used for tables that hold only
# content the user created. Those are still filtered by FORBIDDEN_FRAGMENTS
# below, so a credential column added to one of them does not ride along.
EXPORTABLE: dict[str, tuple[str, ...] | None] = {
    "users": ("id", "email", "name", "is_active", "created_at", "updated_at"),
    "user_settings": ("user_id", "theme", "reduced_motion", "country", "language",
                      "photo_reuse_consent", "photo_retention_consent",
                      "created_at", "updated_at"),
    "analyses": ("id", "user_id", "status", "face_analysis", "color_analysis",
                 "hair_analysis", "body_analysis", "skin_analysis", "quality",
                 "error_message", "photo_deleted_at", "created_at", "updated_at"),
    "recommendations": None,
    "beauty_profiles": None,
    "onboarding_responses": None,
    "saved_looks": None,
    "look_drafts": None,
    "look_feedback": None,
    "look_collections": None,
    "collection_items": None,
    "beauty_goals": None,
    "beauty_activities": None,
    "guide_progress": None,
    "profile_corrections": None,
    "plan_actions": None,
    "action_feedback": None,
    "chat_sessions": None,
    "chat_messages": None,
}

# Substrings that may never appear in an exported column name, whatever the
# allowlist says. This is the half that holds when someone adds a column to a
# table marked None.
FORBIDDEN_FRAGMENTS = ("password", "secret", "token", "credential", "api_key",
                       "hash", "salt", "private")

# `client_token` is an idempotency key the client generated and already holds.
# It is not a credential, and dropping it would break a round-trip.
FORBIDDEN_EXCEPTIONS = {"client_token"}


def exportable_columns(table) -> tuple[str, ...]:
    """Which columns of this table are allowed to leave the server."""
    allowed = EXPORTABLE.get(table.name)
    names = tuple(c.name for c in table.columns) if allowed is None else allowed
    return tuple(
        name for name in names
        if name in FORBIDDEN_EXCEPTIONS
        or not any(bad in name.lower() for bad in FORBIDDEN_FRAGMENTS))


def _plain(row, *, drop: tuple[str, ...] = ()) -> dict:
    """A model row as JSON, restricted to the columns allowed to be exported."""
    allowed = exportable_columns(row.__table__)
    out = {}
    for column in row.__table__.columns:
        if column.name not in allowed or column.name in drop:
            continue
        value = getattr(row, column.name)
        out[column.name] = _iso(value) if isinstance(value, datetime) else value
    return out


# Named at the call site for readability; the allowlist is what enforces it.
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
        if not photo_storage.is_stored(analysis.image_url):
            continue
        try:
            if await photo_storage.delete(analysis.image_url):
                removed += 1
                continue
            await _queue_orphan(db, analysis.image_url, "delete returned false")
        except Exception as exc:
            logger.exception("photo delete failed during account deletion")
            await _queue_orphan(db, analysis.image_url, type(exc).__name__)

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
        # Queued rather than lost. After this request the queue is the only
        # thing that still knows these objects exist.
        "photographsQueuedForRetry": attempted - removed,
        "retentionNote": RETENTION_NOTE,
    }
