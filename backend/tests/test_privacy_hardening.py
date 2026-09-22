"""The three checks made before the Phase 6 deployment.

Each one found a real gap, so each one keeps a test:

1. Export used a denylist, so any credential column added later would have
   shipped to the user's device by default.
2. A failed object delete during account deletion lost the only reference to
   the file, leaving it in the bucket with nothing that knew it existed.
3. A Firebase account could be deleted on the strength of a valid ID token,
   which Firebase refreshes hourly on its own and which therefore says nothing
   about who is holding the phone.
"""
import pytest
import sqlalchemy as sa
from httpx import AsyncClient
from sqlalchemy import select

from core.database import Base
from models.analysis import Analysis
from models.beauty import PendingPhotoDeletion
from models.user import User
from services import photo_storage, privacy_service

CONFIRM = privacy_service.DELETE_CONFIRMATION
PASSWORD = "password123"


async def _register(client: AsyncClient, email: str) -> dict:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Hardening", "email": email,
                                  "password": PASSWORD})
    assert reg.status_code == 201, reg.text
    return {"Authorization": f"Bearer {reg.json()['access_token']}"}


async def _user_id(db_session, email: str) -> str:
    row = await db_session.execute(select(User).where(User.email == email))
    return row.scalar_one().id


def _stored_url(name: str) -> str:
    return f"https://cdn.example.com/uploads/{name}"


async def _seed_analysis(db_session, user_id: str, name: str) -> Analysis:
    analysis = Analysis(user_id=user_id, image_url=_stored_url(name),
                        status="complete", face_analysis={"shape": "oval"})
    db_session.add(analysis)
    await db_session.flush()
    return analysis


async def _make_external(db_session, user_id: str) -> None:
    """Externally authenticated accounts carry no usable local password."""
    user = await db_session.get(User, user_id)
    user.hashed_password = ""
    await db_session.flush()


# ------------------------------------------------- 1. export is an allowlist

def test_every_exported_table_is_named_in_the_allowlist():
    """A table reaching the export must be a decision, not a default."""
    from models.beauty import (BeautyActivity, BeautyGoal, LookCollection,
                               LookDraft, SavedLook, UserSettings)

    for model in (User, Analysis, SavedLook, LookDraft, BeautyGoal,
                  BeautyActivity, LookCollection, UserSettings):
        assert model.__tablename__ in privacy_service.EXPORTABLE, (
            f"{model.__tablename__} is exported but not in the allowlist")


def test_no_credential_shaped_column_survives_the_filter():
    """The half that holds for tables the allowlist marks as `None`."""
    for table in Base.metadata.tables.values():
        if table.name not in privacy_service.EXPORTABLE:
            continue
        for name in privacy_service.exportable_columns(table):
            if name in privacy_service.FORBIDDEN_EXCEPTIONS:
                continue
            lowered = name.lower()
            for fragment in privacy_service.FORBIDDEN_FRAGMENTS:
                assert fragment not in lowered, (
                    f"{table.name}.{name} would be exported")


def test_a_column_added_later_is_excluded_without_anyone_remembering():
    """The whole point of the allowlist, stated as a test."""
    probe = sa.Table(
        "saved_looks", sa.MetaData(),
        sa.Column("id", sa.String(), primary_key=True),
        sa.Column("refresh_token", sa.String()),
        sa.Column("reset_secret", sa.String()),
        sa.Column("client_token", sa.String()),
    )
    allowed = privacy_service.exportable_columns(probe)
    assert "refresh_token" not in allowed
    assert "reset_secret" not in allowed
    # An idempotency key the client generated and already holds is not a
    # credential, and dropping it would break a round-trip.
    assert "client_token" in allowed


def test_the_users_table_can_never_export_its_password_hash():
    allowed = privacy_service.exportable_columns(User.__table__)
    assert "hashed_password" not in allowed
    assert "email" in allowed and "name" in allowed


# --------------------------------------------- 2. failed deletes are durable

@pytest.mark.asyncio
async def test_a_failed_delete_is_queued_rather_than_orphaned(
        client, db_session, monkeypatch):
    async def _fail(url):
        raise RuntimeError("bucket unreachable")

    monkeypatch.setattr(photo_storage, "delete", _fail)
    monkeypatch.setattr(photo_storage, "configured", lambda: True)

    auth = await _register(client, "orphan-queue@test.com")
    user_id = await _user_id(db_session, "orphan-queue@test.com")
    await _seed_analysis(db_session, user_id, "orphan")

    response = await client.post("/api/v1/privacy/delete-account", headers=auth,
                                 json={"confirmation": CONFIRM,
                                       "password": PASSWORD})
    assert response.status_code == 200
    assert response.json()["photographsQueuedForRetry"] == 1

    rows = await db_session.execute(select(PendingPhotoDeletion))
    queued = list(rows.scalars())
    assert [q.object_key for q in queued] == ["uploads/orphan"]
    assert queued[0].attempts >= 1

    # The account is gone, so this row is now the only record that the object
    # exists at all. That is exactly why it holds no user reference.
    gone = await db_session.execute(select(User).where(User.id == user_id))
    assert gone.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_the_queue_drains_when_storage_comes_back(
        client, db_session, monkeypatch):
    async def _fail(url):
        raise RuntimeError("bucket unreachable")

    monkeypatch.setattr(photo_storage, "delete", _fail)
    monkeypatch.setattr(photo_storage, "configured", lambda: True)

    auth = await _register(client, "orphan-drain@test.com")
    user_id = await _user_id(db_session, "orphan-drain@test.com")
    analysis = await _seed_analysis(db_session, user_id, "drain")
    assert (await client.delete(f"/api/v1/privacy/photos/{analysis.id}",
                                headers=auth)).status_code == 200

    rows = await db_session.execute(select(PendingPhotoDeletion))
    assert [r.object_key for r in rows.scalars()] == ["uploads/drain"]

    drained: list[str] = []

    async def _works(url):
        drained.append(url)
        return True

    monkeypatch.setattr(photo_storage, "delete", _works)
    # Storage recovers; the next visit to the photos screen clears the backlog.
    assert (await client.get("/api/v1/privacy/photos",
                             headers=auth)).status_code == 200

    rows = await db_session.execute(select(PendingPhotoDeletion))
    assert list(rows.scalars()) == []
    assert any("uploads/drain" in url for url in drained)


@pytest.mark.asyncio
async def test_a_retry_that_fails_again_stays_queued(
        client, db_session, monkeypatch):
    """A backlog is acceptable. Dropping the record silently is not."""
    async def _fail(url):
        raise RuntimeError("still down")

    monkeypatch.setattr(photo_storage, "delete", _fail)
    monkeypatch.setattr(photo_storage, "configured", lambda: True)

    auth = await _register(client, "orphan-persist@test.com")
    user_id = await _user_id(db_session, "orphan-persist@test.com")
    analysis = await _seed_analysis(db_session, user_id, "persist")
    await client.delete(f"/api/v1/privacy/photos/{analysis.id}", headers=auth)

    first = await db_session.execute(select(PendingPhotoDeletion))
    attempts_before = list(first.scalars())[0].attempts

    await client.get("/api/v1/privacy/photos", headers=auth)

    rows = await db_session.execute(select(PendingPhotoDeletion))
    still = list(rows.scalars())
    assert [r.object_key for r in still] == ["uploads/persist"]
    assert still[0].attempts > attempts_before
    assert still[0].last_error


def test_the_queue_holds_no_personal_data():
    """It has to outlive the account, so it must not carry anything about it."""
    columns = {c.name for c in PendingPhotoDeletion.__table__.columns}
    assert "user_id" not in columns
    assert not PendingPhotoDeletion.__table__.foreign_keys
    assert columns == {"object_key", "attempts", "last_error",
                       "created_at", "last_tried_at"}


# ------------------------------------- 3. deletion needs recent authentication

@pytest.mark.asyncio
async def test_a_stale_firebase_session_cannot_delete_the_account(
        client, db_session):
    import api.routes.privacy as privacy_routes
    from api.deps import REAUTH_MAX_AGE_SECONDS
    from main import app

    auth = await _register(client, "firebase-stale@test.com")
    user_id = await _user_id(db_session, "firebase-stale@test.com")
    await _make_external(db_session, user_id)

    app.dependency_overrides[privacy_routes.firebase_auth_age] = (
        lambda: float(REAUTH_MAX_AGE_SECONDS + 60))
    try:
        response = await client.post("/api/v1/privacy/delete-account", headers=auth,
                                     json={"confirmation": CONFIRM})
        assert response.status_code == 401
        assert "sign in again" in response.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(privacy_routes.firebase_auth_age, None)

    survived = await db_session.execute(select(User).where(User.id == user_id))
    assert survived.scalar_one_or_none() is not None


@pytest.mark.asyncio
async def test_a_fresh_firebase_session_may_delete_the_account(
        client, db_session, monkeypatch):
    import api.routes.privacy as privacy_routes
    from main import app

    monkeypatch.setattr(photo_storage, "configured", lambda: True)

    auth = await _register(client, "firebase-fresh@test.com")
    user_id = await _user_id(db_session, "firebase-fresh@test.com")
    await _make_external(db_session, user_id)

    app.dependency_overrides[privacy_routes.firebase_auth_age] = lambda: 30.0
    try:
        response = await client.post("/api/v1/privacy/delete-account", headers=auth,
                                     json={"confirmation": CONFIRM})
        assert response.status_code == 200
    finally:
        app.dependency_overrides.pop(privacy_routes.firebase_auth_age, None)

    gone = await db_session.execute(select(User).where(User.id == user_id))
    assert gone.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_an_account_with_no_proof_of_presence_is_refused(
        client, db_session):
    """No local password and no Firebase session: a bearer token alone is not
    evidence that the account holder is present, so this is refused."""
    auth = await _register(client, "no-evidence@test.com")
    user_id = await _user_id(db_session, "no-evidence@test.com")
    await _make_external(db_session, user_id)

    response = await client.post("/api/v1/privacy/delete-account", headers=auth,
                                 json={"confirmation": CONFIRM})
    assert response.status_code == 401

    survived = await db_session.execute(select(User).where(User.id == user_id))
    assert survived.scalar_one_or_none() is not None


def test_firebase_claims_carry_auth_time():
    """Without this claim the recency check has nothing to read.

    `iat` is not a substitute: Firebase mints a new ID token every hour whether
    or not anyone touched the device.
    """
    import inspect

    from core import firebase_auth

    source = inspect.getsource(firebase_auth.verify_firebase_token)
    assert '"auth_time"' in source


def test_the_reauthentication_window_is_short():
    from api.deps import REAUTH_MAX_AGE_SECONDS

    assert 0 < REAUTH_MAX_AGE_SECONDS <= 15 * 60
