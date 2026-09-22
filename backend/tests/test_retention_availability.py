"""What the retention switch is allowed to claim when there is no bucket.

Production runs with no object storage configured. Consent, capability and
what is actually happening to a photograph are three different facts, and the
failure this file guards against is the app collapsing them into one switch
that reads "on" while nothing is being kept.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from models.analysis import Analysis
from models.beauty import UserSettings
from models.user import User
from services import photo_storage, privacy_service

PASSWORD = "password123"


async def _register(client: AsyncClient, email: str) -> dict:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Retention", "email": email,
                                  "password": PASSWORD})
    assert reg.status_code == 201, reg.text
    return {"Authorization": f"Bearer {reg.json()['access_token']}"}


async def _user_id(db_session, email: str) -> str:
    row = await db_session.execute(select(User).where(User.email == email))
    return row.scalar_one().id


@pytest.fixture
def no_store(monkeypatch):
    """A deployment with no storage configured — production, today."""
    monkeypatch.setattr(photo_storage, "configured", lambda: False)

    async def _delete(url):
        raise AssertionError("nothing should be deleted when nothing is stored")

    monkeypatch.setattr(photo_storage, "delete", _delete)


@pytest.fixture
def with_store(monkeypatch):
    deleted: list[str] = []

    async def _delete(url):
        if not photo_storage.is_stored(url):
            return False
        deleted.append(url)
        return True

    monkeypatch.setattr(photo_storage, "configured", lambda: True)
    monkeypatch.setattr(photo_storage, "delete", _delete)
    return deleted


@pytest.mark.asyncio
async def test_consent_reports_storage_as_unavailable(client, no_store):
    auth = await _register(client, "retention-unavail@test.com")

    body = (await client.get("/api/v1/privacy/consent", headers=auth)).json()

    assert body["storageAvailable"] is False
    assert body["retentionEffective"] is False
    assert body["storageNote"] == privacy_service.STORAGE_UNAVAILABLE_NOTE
    # The note has to say what does survive, or it reads as "nothing is saved".
    assert "analysis results are saved" in body["storageNote"]


@pytest.mark.asyncio
async def test_granting_retention_is_refused_rather_than_recorded(
        client, db_session, no_store):
    """The switch may not be turned on into a deployment that ignores it."""
    auth = await _register(client, "retention-refuse@test.com")
    user_id = await _user_id(db_session, "retention-refuse@test.com")

    response = await client.patch("/api/v1/privacy/consent", headers=auth,
                                  json={"photo_retention_consent": True})

    assert response.status_code == 409
    assert response.json()["detail"] == privacy_service.STORAGE_UNAVAILABLE_NOTE

    row = await db_session.execute(
        select(UserSettings).where(UserSettings.user_id == user_id))
    settings = row.scalar_one_or_none()
    assert settings is None or not settings.photo_retention_consent


@pytest.mark.asyncio
async def test_withdrawal_is_never_blocked_by_unavailable_storage(
        client, db_session, with_store, monkeypatch):
    """Stopping must not depend on the thing that makes starting impossible."""
    auth = await _register(client, "retention-withdraw@test.com")
    granted = await client.patch("/api/v1/privacy/consent", headers=auth,
                                 json={"photo_retention_consent": True})
    assert granted.json()["photoRetentionConsent"] is True

    # Storage disappears afterwards, which is exactly the migration path from
    # a configured deployment to this one.
    monkeypatch.setattr(photo_storage, "configured", lambda: False)

    withdrawn = await client.patch("/api/v1/privacy/consent", headers=auth,
                                   json={"photo_retention_consent": False})

    assert withdrawn.status_code == 200
    assert withdrawn.json()["photoRetentionConsent"] is False


@pytest.mark.asyncio
async def test_existing_consent_is_reported_as_not_in_effect(
        client, db_session, with_store, monkeypatch):
    """A flag recorded while storage existed must not keep making its promise."""
    auth = await _register(client, "retention-stale@test.com")
    await client.patch("/api/v1/privacy/consent", headers=auth,
                       json={"photo_retention_consent": True,
                             "photo_reuse_consent": True})

    monkeypatch.setattr(photo_storage, "configured", lambda: False)
    body = (await client.get("/api/v1/privacy/consent", headers=auth)).json()

    # The stored answer is unchanged — it is still what the person asked for.
    assert body["photoRetentionConsent"] is True
    # What is happening to their photographs is the other two fields.
    assert body["retentionEffective"] is False
    assert body["reuseEffective"] is False


@pytest.mark.asyncio
async def test_photo_list_explains_why_nothing_is_stored(
        client, db_session, no_store):
    auth = await _register(client, "retention-list@test.com")
    user_id = await _user_id(db_session, "retention-list@test.com")
    db_session.add(Analysis(user_id=user_id, image_url=None, status="complete",
                            face_analysis={"shape": "oval"}))
    await db_session.flush()

    body = (await client.get("/api/v1/privacy/photos", headers=auth)).json()

    assert body["storedCount"] == 0
    assert body["photos"][0]["stored"] is False
    # The analysis survives the photograph; the screen must be able to say so.
    assert body["photos"][0]["analysisKept"] is True
    assert body["storageAvailable"] is False
    assert body["storageNote"] == privacy_service.STORAGE_UNAVAILABLE_NOTE


@pytest.mark.asyncio
async def test_a_configured_deployment_carries_no_warning(client, with_store):
    auth = await _register(client, "retention-ok@test.com")

    granted = await client.patch("/api/v1/privacy/consent", headers=auth,
                                 json={"photo_retention_consent": True})
    photos = (await client.get("/api/v1/privacy/photos", headers=auth)).json()

    assert granted.status_code == 200
    assert granted.json()["storageAvailable"] is True
    assert granted.json()["retentionEffective"] is True
    assert granted.json()["storageNote"] is None
    assert photos["storageNote"] is None
