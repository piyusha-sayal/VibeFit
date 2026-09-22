"""The settings screen must not be a back door around the consent rules.

`PATCH /passport/settings` wrote `photo_reuse_consent` straight onto the row.
`PATCH /privacy/consent` refuses to let reuse exceed retention, and refuses
retention entirely when there is nowhere to store a photograph. Two routes,
one setting, one of them enforcing nothing — so the settings screen could put
the app into the exact state the privacy work exists to prevent: reuse
reported as on while no photograph is kept.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from models.beauty import UserSettings
from models.user import User
from services import photo_storage

PASSWORD = "password123"


async def _register(client: AsyncClient, email: str) -> dict:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Settings", "email": email,
                                  "password": PASSWORD})
    assert reg.status_code == 201, reg.text
    return {"Authorization": f"Bearer {reg.json()['access_token']}"}


async def _settings(db_session, email: str) -> UserSettings | None:
    user = (await db_session.execute(
        select(User).where(User.email == email))).scalar_one()
    return (await db_session.execute(
        select(UserSettings).where(UserSettings.user_id == user.id))).scalars().first()


@pytest.fixture
def no_store(monkeypatch):
    monkeypatch.setattr(photo_storage, "configured", lambda: False)


@pytest.fixture
def with_store(monkeypatch):
    monkeypatch.setattr(photo_storage, "configured", lambda: True)

    async def _delete(url):
        return True

    monkeypatch.setattr(photo_storage, "delete", _delete)


@pytest.mark.asyncio
async def test_settings_cannot_grant_reuse_without_retention(
        client, db_session, with_store):
    """The rule the privacy screen enforces, enforced here too."""
    auth = await _register(client, "settings-reuse@example.com")

    response = await client.patch("/api/v1/passport/settings", headers=auth,
                                  json={"photo_reuse_consent": True})

    assert response.status_code == 200
    row = await _settings(db_session, "settings-reuse@example.com")
    assert not row.photo_reuse_consent


@pytest.mark.asyncio
async def test_settings_cannot_grant_reuse_with_no_storage(
        client, db_session, no_store):
    """Nothing is kept, so there is nothing to reuse, whatever is asked for."""
    auth = await _register(client, "settings-nostore@example.com")

    response = await client.patch("/api/v1/passport/settings", headers=auth,
                                  json={"photo_reuse_consent": True})

    assert response.status_code == 200
    row = await _settings(db_session, "settings-nostore@example.com")
    assert row is None or not row.photo_reuse_consent


@pytest.mark.asyncio
async def test_reuse_follows_retention_when_it_exists(
        client, db_session, with_store):
    auth = await _register(client, "settings-both@example.com")
    granted = await client.patch("/api/v1/privacy/consent", headers=auth,
                                 json={"photo_retention_consent": True})
    assert granted.status_code == 200

    response = await client.patch("/api/v1/passport/settings", headers=auth,
                                  json={"photo_reuse_consent": True})

    assert response.status_code == 200
    consent = (await client.get("/api/v1/privacy/consent", headers=auth)).json()
    assert consent["photoReuseConsent"] is True
    assert consent["reuseEffective"] is True


@pytest.mark.asyncio
async def test_the_other_settings_still_save(client, db_session, no_store):
    """The guard must not have broken the rest of the screen."""
    auth = await _register(client, "settings-rest@example.com")

    response = await client.patch("/api/v1/passport/settings", headers=auth,
                                  json={"theme": "dark", "reduced_motion": True,
                                        "country": "India"})

    assert response.status_code == 200
    row = await _settings(db_session, "settings-rest@example.com")
    assert row.theme == "dark"
    assert row.reduced_motion is True
    assert row.country == "India"


@pytest.mark.asyncio
async def test_withdrawing_reuse_from_settings_still_works(
        client, db_session, with_store):
    auth = await _register(client, "settings-off@example.com")
    await client.patch("/api/v1/privacy/consent", headers=auth,
                       json={"photo_retention_consent": True,
                             "photo_reuse_consent": True})

    response = await client.patch("/api/v1/passport/settings", headers=auth,
                                  json={"photo_reuse_consent": False})

    assert response.status_code == 200
    consent = (await client.get("/api/v1/privacy/consent", headers=auth)).json()
    assert consent["photoReuseConsent"] is False
