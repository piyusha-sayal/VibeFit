"""Beauty Passport: aggregation, saved looks, goals, settings, timeline."""
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from models.analysis import Analysis
from models.user import User


async def _register(client: AsyncClient, email: str) -> dict:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Passport Test", "email": email, "password": "password123"})
    assert reg.status_code == 201, reg.text
    return {"Authorization": f"Bearer {reg.json()['access_token']}"}


async def _seed_analysis(db, email: str) -> str:
    user = (await db.execute(select(User).where(User.email == email))).scalars().first()
    analysis = Analysis(
        user_id=user.id, image_url="local://test", status="complete",
        color_analysis={"skinUndertone": "warm", "contrastLevel": "medium",
                        "depth": "medium", "chroma": "muted", "skinColor": "#b07a4f"},
        face_analysis={"shape": "oval", "harmony": None},
        hair_analysis={"texture": "wavy", "length": "medium"},
        quality={"acceptable": True},
    )
    db.add(analysis)
    await db.commit()
    return analysis.id


@pytest.mark.asyncio
async def test_passport_requires_auth(client: AsyncClient):
    assert (await client.get("/api/v1/passport")).status_code in (401, 403)


@pytest.mark.asyncio
async def test_empty_passport_reports_missing_attributes_not_placeholders(client: AsyncClient):
    auth = await _register(client, "passport-empty@test.com")
    body = (await client.get("/api/v1/passport", headers=auth)).json()

    assert body["completion"] == 0.0
    assert body["completed"] == 0
    assert all(a["status"] == "missing" and a["value"] is None for a in body["attributes"])
    # Every gap has to offer the action that closes it.
    assert all(a["action"] for a in body["attributes"])
    assert body["nextAction"]["route"]
    assert body["journey"] == {
        "analyses": 0, "savedLooks": 0, "triedLooks": 0, "wantToTry": 0,
        "completeLooks": 0, "looksInProgress": 0, "collections": 0, "activeGoals": 0,
    }
    assert body["timeline"] == []


@pytest.mark.asyncio
async def test_analysis_fills_the_passport(client: AsyncClient, db_session):
    auth = await _register(client, "passport-filled@test.com")
    await _seed_analysis(db_session, "passport-filled@test.com")

    body = (await client.get("/api/v1/passport", headers=auth)).json()
    by_key = {a["key"]: a for a in body["attributes"]}

    assert by_key["personal_colour"]["status"] == "present"
    assert by_key["personal_colour"]["value"]  # a real season label
    assert by_key["face_shape"]["value"] == "oval"
    assert by_key["hair_type"]["value"] == "wavy"
    assert by_key["lipstick_palette"]["value"]
    assert body["completion"] > 0
    assert body["journey"]["analyses"] == 1
    # Not scanned or declared yet, so still missing rather than guessed.
    assert by_key["body_type"]["status"] == "missing"


@pytest.mark.asyncio
async def test_styling_profile_is_a_partial_upsert(client: AsyncClient):
    auth = await _register(client, "passport-profile@test.com")
    assert (await client.get("/api/v1/passport/profile", headers=auth)).status_code == 404

    first = await client.put("/api/v1/passport/profile", headers=auth,
                             json={"body_type": "pear", "aesthetics": ["minimalist"]})
    assert first.status_code == 200, first.text
    second = await client.put("/api/v1/passport/profile", headers=auth,
                              json={"hair_length": "long"})
    assert second.status_code == 200
    body = second.json()
    assert body["body_type"] == "pear"        # survived the second write
    assert body["hair_length"] == "long"


@pytest.mark.asyncio
async def test_body_type_accepts_opting_out_and_rejects_nonsense(client: AsyncClient):
    auth = await _register(client, "passport-body@test.com")
    ok = await client.put("/api/v1/passport/profile", headers=auth,
                          json={"body_type": "uncategorised"})
    assert ok.status_code == 200
    bad = await client.put("/api/v1/passport/profile", headers=auth,
                           json={"body_type": "banana"})
    assert bad.status_code == 422


@pytest.mark.asyncio
async def test_saved_looks_persist_and_appear_on_the_timeline(client: AsyncClient):
    auth = await _register(client, "passport-looks@test.com")
    created = await client.post("/api/v1/passport/looks", headers=auth, json={
        "name": "Diwali evening", "kind": "complete", "occasion": "festival",
        "payload": {"lipstick": "Brick", "outfit": "Rust saree"},
    })
    assert created.status_code == 201, created.text
    look_id = created.json()["id"]

    listed = (await client.get("/api/v1/passport/looks", headers=auth)).json()
    assert [l["id"] for l in listed] == [look_id]
    assert listed[0]["payload"]["outfit"] == "Rust saree"

    passport = (await client.get("/api/v1/passport", headers=auth)).json()
    assert passport["journey"]["savedLooks"] == 1
    assert passport["timeline"][0]["kind"] == "look_saved"


@pytest.mark.asyncio
async def test_marking_a_look_tried_is_recorded_once(client: AsyncClient):
    auth = await _register(client, "passport-tried@test.com")
    look_id = (await client.post("/api/v1/passport/looks", headers=auth,
                                 json={"name": "Office day", "kind": "makeup"})).json()["id"]

    first = await client.patch(f"/api/v1/passport/looks/{look_id}", headers=auth,
                               json={"status": "tried"})
    assert first.status_code == 200 and first.json()["status"] == "tried"
    await client.patch(f"/api/v1/passport/looks/{look_id}", headers=auth, json={"status": "tried"})

    passport = (await client.get("/api/v1/passport", headers=auth)).json()
    assert passport["journey"]["triedLooks"] == 1
    assert [t["kind"] for t in passport["timeline"]].count("look_tried") == 1


@pytest.mark.asyncio
async def test_looks_are_private_to_their_owner(client: AsyncClient):
    mine = await _register(client, "passport-mine@test.com")
    theirs = await _register(client, "passport-theirs@test.com")
    look_id = (await client.post("/api/v1/passport/looks", headers=mine,
                                 json={"name": "Private", "kind": "outfit"})).json()["id"]

    assert (await client.get("/api/v1/passport/looks", headers=theirs)).json() == []
    assert (await client.patch(f"/api/v1/passport/looks/{look_id}", headers=theirs,
                               json={"status": "tried"})).status_code == 404
    assert (await client.delete(f"/api/v1/passport/looks/{look_id}", headers=theirs)).status_code == 404


@pytest.mark.asyncio
async def test_unknown_look_kind_is_rejected(client: AsyncClient):
    auth = await _register(client, "passport-kind@test.com")
    res = await client.post("/api/v1/passport/looks", headers=auth,
                            json={"name": "Nope", "kind": "interpretive_dance"})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_goals_track_completion(client: AsyncClient):
    auth = await _register(client, "passport-goals@test.com")
    goal_id = (await client.post("/api/v1/passport/goals", headers=auth,
                                 json={"title": "Grow out a fringe"})).json()["id"]

    passport = (await client.get("/api/v1/passport", headers=auth)).json()
    assert passport["journey"]["activeGoals"] == 1

    done = await client.patch(f"/api/v1/passport/goals/{goal_id}", headers=auth,
                              json={"status": "done"})
    assert done.status_code == 200
    assert done.json()["completed_at"] is not None
    after = (await client.get("/api/v1/passport", headers=auth)).json()
    assert after["journey"]["activeGoals"] == 0


@pytest.mark.asyncio
async def test_settings_default_then_persist(client: AsyncClient):
    auth = await _register(client, "passport-settings@test.com")
    defaults = (await client.get("/api/v1/passport/settings", headers=auth)).json()
    assert defaults["theme"] == "system"
    assert defaults["photo_reuse_consent"] is False

    updated = await client.patch("/api/v1/passport/settings", headers=auth,
                                 json={"theme": "dark", "photo_reuse_consent": True})
    assert updated.status_code == 200
    assert updated.json()["theme"] == "dark"

    again = (await client.get("/api/v1/passport/settings", headers=auth)).json()
    assert again["theme"] == "dark" and again["photo_reuse_consent"] is True

    bad = await client.patch("/api/v1/passport/settings", headers=auth, json={"theme": "neon"})
    assert bad.status_code == 422


@pytest.mark.asyncio
async def test_photo_reuse_consent_surfaces_on_the_passport(client: AsyncClient):
    auth = await _register(client, "passport-consent@test.com")
    assert (await client.get("/api/v1/passport", headers=auth)).json()["photoReuseConsent"] is False
    await client.patch("/api/v1/passport/settings", headers=auth, json={"photo_reuse_consent": True})
    assert (await client.get("/api/v1/passport", headers=auth)).json()["photoReuseConsent"] is True


@pytest.mark.asyncio
async def test_a_scan_never_produces_body_analysis(client: AsyncClient, _jpeg):
    """The pipeline must not write body_analysis, even for a frontal photo.

    Historical rows keep whatever they already stored; what matters is that no
    new scan derives a body shape from a photograph.
    """
    auth = await _register(client, "passport-nobody@test.com")
    res = await client.post("/api/v1/analysis/upload", headers=auth,
                            files={"file": ("scan.jpg", _jpeg(), "image/jpeg")})
    assert res.status_code == 201, res.text
    assert res.json().get("body_analysis") is None


@pytest.mark.asyncio
async def test_body_shape_on_the_vibe_profile_comes_from_the_user(client: AsyncClient):
    auth = await _register(client, "passport-selfselect@test.com")
    before = (await client.get("/api/v1/profile/vibe", headers=auth)).json()
    assert before["attributes"]["body_shape"]["value"] is None
    assert before["attributes"]["body_shape"]["source"] == "none"

    await client.put("/api/v1/passport/profile", headers=auth, json={"body_type": "hourglass"})

    after = (await client.get("/api/v1/profile/vibe", headers=auth)).json()
    attr = after["attributes"]["body_shape"]
    assert attr["value"] == "hourglass"
    assert attr["source"] == "questionnaire"
    assert attr["confidence"] == "user_selected"
