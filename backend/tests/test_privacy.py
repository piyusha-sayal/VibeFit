"""Account deletion, data export, photograph removal and consent.

These are the promises that have to be true in the database and the object
store, not only on a settings screen, so the tests check both sides: the rows
that disappear and the storage calls that were made.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from models.analysis import Analysis
from models.beauty import (BeautyActivity, BeautyGoal, LookCollection,
                           LookDraft, SavedLook, UserSettings)
from models.user import User
from services import photo_storage, privacy_service

CONFIRM = privacy_service.DELETE_CONFIRMATION
PASSWORD = "password123"


async def _register(client: AsyncClient, email: str) -> dict:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Privacy", "email": email,
                                  "password": PASSWORD})
    assert reg.status_code == 201, reg.text
    return {"Authorization": f"Bearer {reg.json()['access_token']}"}


@pytest.fixture
def fake_store(monkeypatch):
    """Record deletes instead of calling S3, and pretend a store is configured."""
    deleted: list[str] = []

    async def _delete(url):
        if not photo_storage.is_stored(url):
            return False
        deleted.append(url)
        return True

    monkeypatch.setattr(photo_storage, "delete", _delete)
    monkeypatch.setattr(photo_storage, "configured", lambda: True)
    return deleted


def _stored_url(name: str) -> str:
    return f"https://cdn.example.com/uploads/{name}"


async def _seed_analysis(db_session, user_id: str, name: str) -> Analysis:
    analysis = Analysis(user_id=user_id, image_url=_stored_url(name),
                        status="complete", face_analysis={"shape": "oval"})
    db_session.add(analysis)
    await db_session.flush()
    return analysis


async def _user_id(db_session, email: str) -> str:
    row = await db_session.execute(select(User).where(User.email == email))
    return row.scalar_one().id


# --------------------------------------------------------------- photographs

@pytest.mark.asyncio
async def test_photo_list_never_leaks_the_url(client, db_session, fake_store):
    auth = await _register(client, "photo-list@test.com")
    user_id = await _user_id(db_session, "photo-list@test.com")
    await _seed_analysis(db_session, user_id, "a")

    response = await client.get("/api/v1/privacy/photos", headers=auth)
    assert response.status_code == 200
    body = response.json()
    assert body["storedCount"] == 1
    assert body["photos"][0]["stored"] is True
    assert "cdn.example.com" not in response.text


@pytest.mark.asyncio
async def test_deleting_one_photo_keeps_the_analysis(client, db_session, fake_store):
    auth = await _register(client, "photo-one@test.com")
    user_id = await _user_id(db_session, "photo-one@test.com")
    analysis = await _seed_analysis(db_session, user_id, "b")

    response = await client.delete(f"/api/v1/privacy/photos/{analysis.id}",
                                   headers=auth)
    assert response.status_code == 200
    assert response.json()["objectRemoved"] is True
    assert fake_store == [_stored_url("b")]

    await db_session.refresh(analysis)
    assert analysis.image_url is None
    assert analysis.photo_deleted_at is not None
    # The results the user came for survive the photograph going away.
    assert analysis.face_analysis == {"shape": "oval"}


@pytest.mark.asyncio
async def test_cannot_delete_another_users_photo(client, db_session, fake_store):
    owner = await _register(client, "photo-owner@test.com")
    await _register(client, "photo-thief@test.com")
    owner_id = await _user_id(db_session, "photo-owner@test.com")
    analysis = await _seed_analysis(db_session, owner_id, "c")

    thief = await _register(client, "photo-thief2@test.com")
    response = await client.delete(f"/api/v1/privacy/photos/{analysis.id}",
                                   headers=thief)
    assert response.status_code == 404
    assert fake_store == []

    await db_session.refresh(analysis)
    assert analysis.image_url == _stored_url("c")

    # The owner can still delete it, so the 404 was about ownership.
    assert (await client.delete(f"/api/v1/privacy/photos/{analysis.id}",
                                headers=owner)).status_code == 200


@pytest.mark.asyncio
async def test_delete_all_photos(client, db_session, fake_store):
    auth = await _register(client, "photo-all@test.com")
    user_id = await _user_id(db_session, "photo-all@test.com")
    for name in ("d", "e", "f"):
        await _seed_analysis(db_session, user_id, name)

    response = await client.delete("/api/v1/privacy/photos", headers=auth)
    assert response.status_code == 200
    assert response.json()["objectsRemoved"] == 3
    assert len(fake_store) == 3

    after = await client.get("/api/v1/privacy/photos", headers=auth)
    assert after.json()["storedCount"] == 0


@pytest.mark.asyncio
async def test_photo_routes_require_authentication(client):
    for method, path in (("get", "/api/v1/privacy/photos"),
                         ("get", "/api/v1/privacy/consent"),
                         ("get", "/api/v1/privacy/export")):
        response = await getattr(client, method)(path)
        assert response.status_code in (401, 403)


# ------------------------------------------------------------------ consent

@pytest.mark.asyncio
async def test_retention_is_off_by_default(client):
    auth = await _register(client, "consent-default@test.com")
    body = (await client.get("/api/v1/privacy/consent", headers=auth)).json()
    assert body["photoRetentionConsent"] is False
    assert body["photoReuseConsent"] is False


@pytest.mark.asyncio
async def test_reuse_cannot_be_granted_without_retention(client):
    auth = await _register(client, "consent-reuse@test.com")
    response = await client.patch("/api/v1/privacy/consent", headers=auth,
                                  json={"photo_reuse_consent": True})
    assert response.status_code == 200
    # Nothing would be kept to reuse, so the switch must not read as on.
    assert response.json()["photoReuseConsent"] is False


@pytest.mark.asyncio
async def test_withdrawing_retention_deletes_what_was_kept(
        client, db_session, fake_store):
    auth = await _register(client, "consent-withdraw@test.com")
    user_id = await _user_id(db_session, "consent-withdraw@test.com")

    granted = await client.patch("/api/v1/privacy/consent", headers=auth, json={
        "photo_retention_consent": True, "photo_reuse_consent": True})
    assert granted.json() == {**granted.json(), "photoRetentionConsent": True,
                              "photoReuseConsent": True}
    await _seed_analysis(db_session, user_id, "g")

    withdrawn = await client.patch("/api/v1/privacy/consent", headers=auth,
                                   json={"photo_retention_consent": False})
    assert withdrawn.json()["photoRetentionConsent"] is False
    # Withdrawal is an instruction, not a preference: the file goes too.
    assert fake_store == [_stored_url("g")]
    assert withdrawn.json()["photoReuseConsent"] is False


@pytest.mark.asyncio
async def test_retention_off_removes_the_photo_when_analysis_completes(
        client, db_session, fake_store):
    """The default path: analyse, keep the results, drop the image."""
    from services.analysis_service import AnalysisService

    auth = await _register(client, "retention-auto@test.com")
    assert auth
    user_id = await _user_id(db_session, "retention-auto@test.com")
    analysis = await _seed_analysis(db_session, user_id, "h")
    analysis.status = "processing"

    service = AnalysisService(db_session, cache=None, ai=None)
    await service._enforce_retention(analysis, user_id)

    assert fake_store == [_stored_url("h")]
    assert analysis.image_url is None
    assert analysis.photo_deleted_at is not None


@pytest.mark.asyncio
async def test_retention_on_keeps_the_photo(client, db_session, fake_store):
    from services.analysis_service import AnalysisService

    auth = await _register(client, "retention-keep@test.com")
    user_id = await _user_id(db_session, "retention-keep@test.com")
    await client.patch("/api/v1/privacy/consent", headers=auth,
                       json={"photo_retention_consent": True})
    analysis = await _seed_analysis(db_session, user_id, "i")

    service = AnalysisService(db_session, cache=None, ai=None)
    await service._enforce_retention(analysis, user_id)

    assert fake_store == []
    assert analysis.image_url == _stored_url("i")


# ------------------------------------------------------------------- export

@pytest.mark.asyncio
async def test_export_contains_the_users_data_and_no_password_hash(
        client, db_session, fake_store):
    auth = await _register(client, "export-me@test.com")
    user_id = await _user_id(db_session, "export-me@test.com")
    await _seed_analysis(db_session, user_id, "j")
    db_session.add(SavedLook(user_id=user_id, kind="complete", name="Monday",
                             payload={"outfit": {"pieces": []}}))
    db_session.add(BeautyGoal(user_id=user_id, title="Try a bolder lip"))
    await db_session.flush()

    response = await client.get("/api/v1/privacy/export", headers=auth)
    assert response.status_code == 200
    assert "attachment" in response.headers["content-disposition"]
    body = response.json()

    assert body["account"]["email"] == "export-me@test.com"
    assert "hashed_password" not in body["account"]
    assert "hashed_password" not in response.text
    assert len(body["analyses"]) == 1
    # Named, not embedded, and never the storage URL.
    assert body["analyses"][0]["photographStored"] is True
    assert "image_url" not in body["analyses"][0]
    assert [look["name"] for look in body["savedLooks"]] == ["Monday"]
    assert [goal["title"] for goal in body["beautyGoals"]] == ["Try a bolder lip"]


@pytest.mark.asyncio
async def test_export_holds_only_the_requesting_user(client, db_session):
    other = await _register(client, "export-other@test.com")
    other_id = await _user_id(db_session, "export-other@test.com")
    db_session.add(SavedLook(user_id=other_id, kind="complete",
                             name="Not yours", payload={}))
    await db_session.flush()
    assert other

    mine = await _register(client, "export-mine@test.com")
    body = (await client.get("/api/v1/privacy/export", headers=mine)).json()
    assert body["savedLooks"] == []
    assert "Not yours" not in str(body)
    assert "export-other@test.com" not in str(body)


@pytest.mark.asyncio
async def test_export_of_an_empty_account_is_still_usable(client):
    auth = await _register(client, "export-empty@test.com")
    body = (await client.get("/api/v1/privacy/export", headers=auth)).json()
    assert body["format"].startswith("MyLookFit account export")
    assert body["savedLooks"] == [] and body["analyses"] == []
    assert body["account"]["email"] == "export-empty@test.com"


# ----------------------------------------------------------------- deletion

@pytest.mark.asyncio
async def test_deletion_needs_the_typed_confirmation(client):
    auth = await _register(client, "delete-phrase@test.com")
    response = await client.post("/api/v1/privacy/delete-account", headers=auth,
                                 json={"confirmation": "delete",
                                       "password": PASSWORD})
    assert response.status_code == 400
    assert CONFIRM in response.json()["detail"]


@pytest.mark.asyncio
async def test_deletion_needs_the_password(client):
    auth = await _register(client, "delete-nopass@test.com")
    missing = await client.post("/api/v1/privacy/delete-account", headers=auth,
                                json={"confirmation": CONFIRM})
    assert missing.status_code == 400

    wrong = await client.post("/api/v1/privacy/delete-account", headers=auth,
                              json={"confirmation": CONFIRM,
                                    "password": "not-the-password"})
    assert wrong.status_code == 401


@pytest.mark.asyncio
async def test_deletion_requires_authentication(client):
    response = await client.post("/api/v1/privacy/delete-account",
                                 json={"confirmation": CONFIRM,
                                       "password": PASSWORD})
    assert response.status_code in (401, 403)


@pytest.mark.asyncio
async def test_deletion_removes_every_related_row_and_the_photos(
        client, db_session, fake_store):
    auth = await _register(client, "delete-full@test.com")
    user_id = await _user_id(db_session, "delete-full@test.com")

    await _seed_analysis(db_session, user_id, "k")
    look = SavedLook(user_id=user_id, kind="complete", name="Gone",
                     payload={"outfit": {"pieces": []}})
    db_session.add(look)
    db_session.add(LookDraft(user_id=user_id, name="Draft", composition={}))
    db_session.add(BeautyGoal(user_id=user_id, title="Goal"))
    db_session.add(BeautyActivity(user_id=user_id, kind="look_saved",
                                  summary="Saved a look"))
    db_session.add(LookCollection(user_id=user_id, name="Work"))
    db_session.add(UserSettings(user_id=user_id, theme="dark"))
    await db_session.flush()

    response = await client.post("/api/v1/privacy/delete-account", headers=auth,
                                 json={"confirmation": CONFIRM,
                                       "password": PASSWORD})
    assert response.status_code == 200
    body = response.json()
    assert body["deleted"] is True
    assert body["photographsAttempted"] == 1
    assert body["photographsRemoved"] == 1
    assert body["retentionNote"]
    assert fake_store == [_stored_url("k")]

    for model in (Analysis, SavedLook, LookDraft, BeautyGoal, BeautyActivity,
                  LookCollection, UserSettings):
        rows = await db_session.execute(
            select(model).where(model.user_id == user_id))
        assert rows.scalars().first() is None, f"{model.__name__} survived"

    user = await db_session.execute(select(User).where(User.id == user_id))
    assert user.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_a_deleted_account_cannot_keep_using_its_token(
        client, db_session, fake_store):
    auth = await _register(client, "delete-token@test.com")
    assert (await client.get("/api/v1/passport", headers=auth)).status_code == 200

    deleted = await client.post("/api/v1/privacy/delete-account", headers=auth,
                                json={"confirmation": CONFIRM,
                                      "password": PASSWORD})
    assert deleted.status_code == 200

    # The token is still cryptographically valid; the account behind it is not.
    for path in ("/api/v1/passport", "/api/v1/privacy/export",
                 "/api/v1/looks/context"):
        assert (await client.get(path, headers=auth)).status_code in (401, 403, 404)


@pytest.mark.asyncio
async def test_deletion_leaves_other_accounts_untouched(
        client, db_session, fake_store):
    keeper = await _register(client, "delete-keeper@test.com")
    keeper_id = await _user_id(db_session, "delete-keeper@test.com")
    db_session.add(SavedLook(user_id=keeper_id, kind="complete",
                             name="Still here", payload={}))
    await _seed_analysis(db_session, keeper_id, "keep")
    await db_session.flush()

    doomed = await _register(client, "delete-doomed@test.com")
    await client.post("/api/v1/privacy/delete-account", headers=doomed,
                      json={"confirmation": CONFIRM, "password": PASSWORD})

    rows = await db_session.execute(
        select(SavedLook).where(SavedLook.user_id == keeper_id))
    assert [r.name for r in rows.scalars()] == ["Still here"]
    assert (await client.get("/api/v1/passport", headers=keeper)).status_code == 200
    # The other account's photograph was never touched.
    assert _stored_url("keep") not in fake_store


@pytest.mark.asyncio
async def test_deletion_proceeds_when_object_storage_fails(
        client, db_session, monkeypatch):
    """A bucket outage must not trap someone in an account they want gone."""
    async def _explode(url):
        raise RuntimeError("bucket unreachable")

    monkeypatch.setattr(photo_storage, "delete", _explode)
    monkeypatch.setattr(photo_storage, "configured", lambda: True)

    auth = await _register(client, "delete-partial@test.com")
    user_id = await _user_id(db_session, "delete-partial@test.com")
    await _seed_analysis(db_session, user_id, "l")

    response = await client.post("/api/v1/privacy/delete-account", headers=auth,
                                 json={"confirmation": CONFIRM,
                                       "password": PASSWORD})
    assert response.status_code == 200
    body = response.json()
    assert body["deleted"] is True
    # Reported honestly rather than counted as a success.
    assert body["photographsAttempted"] == 1
    assert body["photographsRemoved"] == 0

    user = await db_session.execute(select(User).where(User.id == user_id))
    assert user.scalar_one_or_none() is None


@pytest.mark.asyncio
async def test_the_old_one_tap_delete_is_gone(client):
    auth = await _register(client, "delete-legacy@test.com")
    response = await client.delete("/api/v1/users/me", headers=auth)
    assert response.status_code == 410
    assert "/privacy/delete-account" in response.json()["detail"]


# ------------------------------------------------------------ storage keys

def test_key_recovery_only_accepts_our_own_urls():
    assert photo_storage.key_for(
        "https://cdn.example.com/uploads/abc") == "uploads/abc"
    assert photo_storage.key_for(
        "https://b.s3.us-east-1.amazonaws.com/uploads/abc") == "uploads/abc"
    # A placeholder names no object.
    assert photo_storage.key_for("local://abc") is None
    assert photo_storage.key_for(None) is None
    # Nothing outside the uploads prefix, and no traversal.
    assert photo_storage.key_for("https://cdn.example.com/secrets/abc") is None
    assert photo_storage.key_for("https://cdn.example.com/uploads/../secrets") is None
    assert photo_storage.key_for("https://cdn.example.com/uploads/") is None
