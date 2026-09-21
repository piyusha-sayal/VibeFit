"""Discover My Face and the studios, end to end through the API."""
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from models.analysis import Analysis
from models.user import User


async def _register(client: AsyncClient, email: str) -> dict:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Face Test", "email": email, "password": "password123"})
    assert reg.status_code == 201, reg.text
    return {"Authorization": f"Bearer {reg.json()['access_token']}"}


async def _seed_scan(db, email: str, *, shape="square") -> str:
    user = (await db.execute(select(User).where(User.email == email))).scalars().first()
    analysis = Analysis(
        user_id=user.id, image_url="local://test", status="complete",
        color_analysis={"skinUndertone": "warm", "contrastLevel": "high",
                        "depth": "medium", "chroma": "bright", "skinColor": "#b07a4f"},
        face_analysis={
            "shape": shape, "alternateShape": "rectangle", "shapeConfidence": 0.71,
            "shapeMeasurements": {"lengthToWidth": 1.2, "jawToCheek": 0.95,
                                  "foreheadToCheek": 0.96, "chinToJaw": 0.6},
            "eyebrow": {"shape": "arched"},
        },
        hair_analysis={"texture": "wavy", "length": "medium"},
        quality={"acceptable": True},
    )
    db.add(analysis)
    await db.commit()
    return analysis.id


# -------------------------------------------------------------- face profile

@pytest.mark.asyncio
async def test_face_endpoints_require_auth(client: AsyncClient):
    for path in ("/api/v1/face/profile", "/api/v1/hair/styles", "/api/v1/accessories"):
        assert (await client.get(path)).status_code in (401, 403), path


@pytest.mark.asyncio
async def test_profile_without_a_scan_reports_unset_rather_than_guessing(client: AsyncClient):
    auth = await _register(client, "face-empty@test.com")
    body = (await client.get("/api/v1/face/profile", headers=auth)).json()

    assert body["hasScan"] is False
    assert body["faceShape"]["value"] is None
    assert body["faceShape"]["source"] == "unset"
    assert all(a["source"] == "unset" for a in body["attributes"])
    assert body["completion"] == 0.0
    # Options are still offered, so the user has a way forward.
    assert all(a["options"] for a in body["attributes"])


@pytest.mark.asyncio
async def test_shape_report_404s_instead_of_defaulting_to_oval(client: AsyncClient):
    auth = await _register(client, "face-noreport@test.com")
    assert (await client.get("/api/v1/face/shape-report", headers=auth)).status_code == 404


@pytest.mark.asyncio
async def test_a_scan_populates_the_measured_attributes_only(client: AsyncClient, db_session):
    auth = await _register(client, "face-scan@test.com")
    await _seed_scan(db_session, "face-scan@test.com")

    body = (await client.get("/api/v1/face/profile", headers=auth)).json()
    by_key = {a["key"]: a for a in body["attributes"]}

    assert body["faceShape"]["value"] == "square"
    assert body["faceShape"]["source"] == "scan"
    assert by_key["brow_shape"]["source"] == "scan"          # measured
    assert by_key["facial_contrast"]["source"] == "scan"     # derived from colour
    assert by_key["facial_contrast"]["value"] == "defined"
    # No classifier exists for these, so they stay the user's to set.
    for key in ("eye_shape", "lip_shape", "cheek_contour"):
        assert by_key[key]["source"] == "unset", key
        assert by_key[key]["value"] is None


@pytest.mark.asyncio
async def test_shape_report_shows_measurements_and_carries_no_ranking(client: AsyncClient,
                                                                      db_session):
    auth = await _register(client, "face-report@test.com")
    await _seed_scan(db_session, "face-report@test.com")

    body = (await client.get("/api/v1/face/shape-report", headers=auth)).json()
    assert body["faceShape"]["measurements"]["lengthToWidth"] == 1.2
    assert body["faceShape"]["guide"]["hairstyles"]
    text = (body["disclaimer"] + body["measurementNote"]).lower()
    assert "not" in text
    for banned in ("score", "rating", "ideal", "attractive"):
        assert banned not in text


# ---------------------------------------------------------------- overrides

@pytest.mark.asyncio
async def test_a_user_selection_is_stored_and_wins_over_the_scan(client: AsyncClient, db_session):
    auth = await _register(client, "face-override@test.com")
    await _seed_scan(db_session, "face-override@test.com")

    res = await client.put("/api/v1/face/attributes/brow_shape",
                           json={"value": "straight"}, headers=auth)
    assert res.status_code == 200
    brow = {a["key"]: a for a in res.json()["attributes"]}["brow_shape"]

    assert brow["value"] == "straight"
    assert brow["userValue"] == "straight"
    assert brow["scanValue"] == "defined_arch", "the scan reading is kept, not overwritten"
    assert brow["overridden"] is True
    assert brow["source"] == "user"


@pytest.mark.asyncio
async def test_self_selected_attributes_can_be_set_without_a_scan(client: AsyncClient):
    auth = await _register(client, "face-selfselect@test.com")
    res = await client.put("/api/v1/face/attributes/eye_shape",
                           json={"value": "hooded"}, headers=auth)
    assert res.status_code == 200
    eye = {a["key"]: a for a in res.json()["attributes"]}["eye_shape"]
    assert eye["value"] == "hooded"
    assert eye["scanValue"] is None
    assert eye["overridden"] is False
    assert eye["styling"]


@pytest.mark.asyncio
async def test_invalid_attribute_values_are_rejected(client: AsyncClient):
    auth = await _register(client, "face-invalid@test.com")
    assert (await client.put("/api/v1/face/attributes/eye_shape",
                             json={"value": "sparkly"}, headers=auth)).status_code == 422
    assert (await client.put("/api/v1/face/attributes/nose_shape",
                             json={"value": "any"}, headers=auth)).status_code == 404
    assert (await client.put("/api/v1/face/shape",
                             json={"value": "trapezoid"}, headers=auth)).status_code == 422


@pytest.mark.asyncio
async def test_face_shape_override_changes_what_the_studios_recommend(client: AsyncClient,
                                                                      db_session):
    auth = await _register(client, "face-shape-override@test.com")
    await _seed_scan(db_session, "face-shape-override@test.com", shape="square")

    before = (await client.get("/api/v1/hair/styles", headers=auth)).json()
    await client.put("/api/v1/face/shape", json={"value": "oblong"}, headers=auth)
    after = (await client.get("/api/v1/hair/styles", headers=auth)).json()

    assert before["faceShape"] == "square"
    assert after["faceShape"] == "oblong"
    assert [s["key"] for s in before["styles"]] != [s["key"] for s in after["styles"]]


# ------------------------------------------------------------------ studios

@pytest.mark.asyncio
async def test_hair_styles_use_the_scan_texture_by_default(client: AsyncClient, db_session):
    auth = await _register(client, "hair-default@test.com")
    await _seed_scan(db_session, "hair-default@test.com")

    body = (await client.get("/api/v1/hair/styles", headers=auth)).json()
    assert body["appliedTexture"] == "wavy"
    assert all("wavy" in s["textures"] for s in body["styles"])
    assert body["disclaimer"]


@pytest.mark.asyncio
async def test_hair_filters_pass_through_the_api(client: AsyncClient, db_session):
    auth = await _register(client, "hair-filter@test.com")
    body = (await client.get(
        "/api/v1/hair/styles?texture=coily&maintenance=low&protective_only=true",
        headers=auth)).json()
    assert body["styles"]
    assert all(s["protective"] and s["maintenance"] == "low" for s in body["styles"])


@pytest.mark.asyncio
async def test_hair_colours_follow_the_season_from_the_colour_engine(client: AsyncClient,
                                                                     db_session):
    auth = await _register(client, "hair-colour@test.com")
    await _seed_scan(db_session, "hair-colour@test.com")

    body = (await client.get("/api/v1/hair/colours", headers=auth)).json()
    assert body["season"] == "bright_spring"
    assert body["colours"][0]["warmth"] in ("warm", "neutral")


@pytest.mark.asyncio
async def test_salon_guide_is_reachable_and_404s_for_an_unknown_cut(client: AsyncClient):
    auth = await _register(client, "hair-salon@test.com")
    ok = await client.get("/api/v1/hair/salon-guide/lob", headers=auth)
    assert ok.status_code == 200 and ok.json()["askFor"]
    assert (await client.get("/api/v1/hair/salon-guide/mohawk", headers=auth)).status_code == 404


@pytest.mark.asyncio
async def test_makeup_look_uses_confirmed_attributes_and_names_the_gaps(client: AsyncClient,
                                                                        db_session):
    auth = await _register(client, "makeup-look@test.com")
    await _seed_scan(db_session, "makeup-look@test.com")
    await client.put("/api/v1/face/attributes/eye_shape", json={"value": "monolid"}, headers=auth)

    body = (await client.get("/api/v1/makeup/looks/soft_glam", headers=auth)).json()
    assert any(t["key"] == "monolid_gradient" for t in body["techniques"])
    assert "lip_shape" in body["missingAttributes"]
    assert body["palette"]["season"] == "bright_spring"
    assert body["foundation"]["shadeFamily"]


@pytest.mark.asyncio
async def test_accessories_bundle_reflects_the_face_shape_and_hides_nothing(client: AsyncClient,
                                                                            db_session):
    auth = await _register(client, "accessories@test.com")
    await _seed_scan(db_session, "accessories@test.com", shape="oblong")

    body = (await client.get("/api/v1/accessories", headers=auth)).json()
    assert body["faceShape"] == "oblong"
    assert any(e["key"] == "jhumka" and e["suited"] for e in body["earrings"])
    assert any(not e["suited"] for e in body["earrings"]), "nothing is filtered away"
    assert body["metals"][0]["warmth"] in ("warm", "neutral")


@pytest.mark.asyncio
async def test_unknown_accessory_category_404s(client: AsyncClient):
    auth = await _register(client, "accessories-404@test.com")
    assert (await client.get("/api/v1/accessories/watches", headers=auth)).status_code == 404


# ----------------------------------------------------------- guide progress

@pytest.mark.asyncio
async def test_guide_progress_starts_empty_and_is_not_an_error(client: AsyncClient):
    auth = await _register(client, "guides-empty@test.com")
    listing = (await client.get("/api/v1/guides/progress", headers=auth)).json()
    assert listing == {"progress": [], "completedCount": 0, "savedCount": 0}

    one = (await client.get("/api/v1/guides/progress/colour-basics", headers=auth)).json()
    assert one["completed"] is False and one["lastStep"] is None


@pytest.mark.asyncio
async def test_progress_updates_partially_and_resumes(client: AsyncClient):
    auth = await _register(client, "guides-resume@test.com")
    await client.put("/api/v1/guides/progress/colour-basics",
                     json={"lastStep": 3}, headers=auth)
    await client.put("/api/v1/guides/progress/colour-basics",
                     json={"saved": True}, headers=auth)

    body = (await client.get("/api/v1/guides/progress/colour-basics", headers=auth)).json()
    assert body["lastStep"] == 3, "a later partial update must not clear the step"
    assert body["saved"] is True
    assert body["completed"] is False


@pytest.mark.asyncio
async def test_completing_a_guide_shows_up_in_the_beauty_journey(client: AsyncClient):
    auth = await _register(client, "guides-complete@test.com")
    done = await client.post("/api/v1/guides/progress/face-shapes/complete", headers=auth)
    assert done.status_code == 200 and done.json()["completed"] is True

    passport = (await client.get("/api/v1/passport", headers=auth)).json()
    kinds = [a["kind"] for a in passport.get("timeline", [])]
    assert "guide_completed" in kinds


@pytest.mark.asyncio
async def test_sync_merges_device_progress_without_clearing_the_server(client: AsyncClient):
    auth = await _register(client, "guides-sync@test.com")
    await client.post("/api/v1/guides/progress/face-shapes/complete", headers=auth)

    res = await client.post("/api/v1/guides/progress/sync",
                            json={"completed": ["colour-basics"], "saved": ["hair-care"]},
                            headers=auth)
    assert res.status_code == 200

    listing = (await client.get("/api/v1/guides/progress", headers=auth)).json()
    by_slug = {row["slug"]: row for row in listing["progress"]}
    assert by_slug["face-shapes"]["completed"] is True, "sync must not clear server progress"
    assert by_slug["colour-basics"]["completed"] is True
    assert by_slug["hair-care"]["saved"] is True


@pytest.mark.asyncio
async def test_one_user_cannot_read_or_change_another_users_progress(client: AsyncClient):
    owner = await _register(client, "guides-owner@test.com")
    other = await _register(client, "guides-other@test.com")

    await client.put("/api/v1/guides/progress/colour-basics",
                     json={"lastStep": 7, "completed": True}, headers=owner)

    # The other user sees their own empty state for the same slug...
    seen = (await client.get("/api/v1/guides/progress/colour-basics", headers=other)).json()
    assert seen["completed"] is False and seen["lastStep"] is None

    # ...and writing to that slug creates their own row, leaving the owner's intact.
    await client.put("/api/v1/guides/progress/colour-basics",
                     json={"lastStep": 1}, headers=other)
    still = (await client.get("/api/v1/guides/progress/colour-basics", headers=owner)).json()
    assert still["lastStep"] == 7 and still["completed"] is True
