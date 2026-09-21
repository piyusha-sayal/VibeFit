"""Discover My Style through the API, including the full user journey."""
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from models.analysis import Analysis
from models.user import User


async def _register(client: AsyncClient, email: str) -> dict:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Style Test", "email": email, "password": "password123"})
    assert reg.status_code == 201, reg.text
    return {"Authorization": f"Bearer {reg.json()['access_token']}"}


async def _seed_colour(db, email: str) -> None:
    user = (await db.execute(select(User).where(User.email == email))).scalars().first()
    db.add(Analysis(
        user_id=user.id, image_url="local://test", status="complete",
        color_analysis={"skinUndertone": "cool", "contrastLevel": "high",
                        "depth": "deep", "chroma": "bright", "skinColor": "#6b4433"},
        face_analysis={"shape": "oval"},
        hair_analysis={"texture": "wavy"},
        quality={"acceptable": True},
    ))
    await db.commit()


@pytest.mark.asyncio
async def test_style_endpoints_require_auth(client: AsyncClient):
    for path in ("/api/v1/style/profile", "/api/v1/style/outfits", "/api/v1/style/garments"):
        assert (await client.get(path)).status_code in (401, 403), path


# ------------------------------------------------------------------ profile

@pytest.mark.asyncio
async def test_an_empty_profile_names_what_is_missing_rather_than_guessing(client: AsyncClient):
    auth = await _register(client, "style-empty@test.com")
    body = (await client.get("/api/v1/style/profile", headers=auth)).json()

    assert body["bodyType"] is None
    assert body["completion"] == 0.0
    assert body["sections"], "the questionnaire is offered section by section"
    for section in body["sections"]:
        assert section["complete"] is False
        for field in section["fields"]:
            assert field["answered"] is False
            assert field["action"], "every gap names the action that fills it"
    assert "never asks for a body photograph" in body["bodyTypeNote"]


@pytest.mark.asyncio
async def test_the_questionnaire_saves_one_section_at_a_time(client: AsyncClient):
    auth = await _register(client, "style-progressive@test.com")

    first = await client.put("/api/v1/style/profile",
                             json={"bodyType": "pear"}, headers=auth)
    assert first.status_code == 200
    assert first.json()["completion"] > 0

    second = await client.put("/api/v1/style/profile",
                              json={"fitPreference": "relaxed"}, headers=auth)
    body = second.json()
    assert body["bodyType"] == "pear", "a later section must not clear an earlier one"
    assert body["fitPreference"] == "relaxed"


@pytest.mark.asyncio
async def test_preferences_are_editable_after_the_fact(client: AsyncClient):
    auth = await _register(client, "style-edit@test.com")
    await client.put("/api/v1/style/profile", json={"bodyType": "apple"}, headers=auth)
    changed = await client.put("/api/v1/style/profile", json={"bodyType": "rectangle"},
                               headers=auth)
    assert changed.json()["bodyType"] == "rectangle"


@pytest.mark.asyncio
async def test_body_type_can_be_declined_and_that_counts_as_an_answer(client: AsyncClient):
    auth = await _register(client, "style-declined@test.com")
    body = (await client.put("/api/v1/style/profile",
                             json={"bodyType": "uncategorised"}, headers=auth)).json()
    assert body["bodyType"] == "uncategorised"
    assert body["bodyTypeDeclined"] is True

    # And recommendations still work.
    outfits = (await client.get("/api/v1/style/outfits", headers=auth)).json()
    assert outfits["outfits"]


@pytest.mark.asyncio
async def test_invalid_values_are_rejected_with_a_clear_message(client: AsyncClient):
    auth = await _register(client, "style-invalid@test.com")
    bad_body = await client.put("/api/v1/style/profile", json={"bodyType": "banana"},
                                headers=auth)
    assert bad_body.status_code == 422

    bad_aesthetic = await client.put("/api/v1/style/profile",
                                     json={"aesthetics": ["cottagecore"]}, headers=auth)
    assert bad_aesthetic.status_code == 422

    bad_height = await client.put("/api/v1/style/profile", json={"heightCm": 900}, headers=auth)
    assert bad_height.status_code == 422


@pytest.mark.asyncio
async def test_unknown_category_and_garment_404(client: AsyncClient):
    auth = await _register(client, "style-404@test.com")
    assert (await client.get("/api/v1/style/garments?category=hats",
                             headers=auth)).status_code == 404
    assert (await client.get("/api/v1/style/garments/spacesuit",
                             headers=auth)).status_code == 404
    assert (await client.get("/api/v1/style/colours/hat_and_socks",
                             headers=auth)).status_code == 404


# ------------------------------------------------------------------- quiz

@pytest.mark.asyncio
async def test_the_quiz_suggests_multiple_aesthetics_and_saves_them(client: AsyncClient):
    auth = await _register(client, "style-quiz@test.com")
    res = await client.post("/api/v1/style/quiz", json={
        "answers": {"outfits": ["monochrome", "kurta_jeans"], "fit": "semi"},
        "save": True,
    }, headers=auth)
    body = res.json()

    assert len(body["suggested"]) > 1, "never files someone under one label"
    assert body["saved"] is True
    profile = (await client.get("/api/v1/style/profile", headers=auth)).json()
    assert profile["aesthetics"] == body["suggested"]
    assert profile["aestheticDetails"][0]["name"]


@pytest.mark.asyncio
async def test_the_quiz_never_overwrites_a_choice_already_made(client: AsyncClient):
    auth = await _register(client, "style-quiz-keep@test.com")
    await client.put("/api/v1/style/profile", json={"aesthetics": ["vintage"]}, headers=auth)
    await client.post("/api/v1/style/quiz",
                      json={"answers": {"fit": "oversized"}, "save": True}, headers=auth)

    profile = (await client.get("/api/v1/style/profile", headers=auth)).json()
    assert profile["aesthetics"] == ["vintage"]


@pytest.mark.asyncio
async def test_the_quiz_can_be_taken_without_saving(client: AsyncClient):
    auth = await _register(client, "style-quiz-nosave@test.com")
    res = await client.post("/api/v1/style/quiz",
                            json={"answers": {"fit": "fitted"}, "save": False}, headers=auth)
    assert res.json()["saved"] is False
    assert (await client.get("/api/v1/style/profile", headers=auth)).json()["aesthetics"] == []


# --------------------------------------------------------------- outfits

@pytest.mark.asyncio
async def test_outfits_work_with_no_profile_and_say_what_would_improve_them(client: AsyncClient):
    auth = await _register(client, "style-partial@test.com")
    body = (await client.get("/api/v1/style/outfits", headers=auth)).json()

    assert body["outfits"], "a brand-new user still gets outfits"
    assert set(body["couldImproveWith"]) == {"colour analysis", "body type", "aesthetics"}
    assert body["personalisedWith"]["season"] is None


@pytest.mark.asyncio
async def test_colour_analysis_flows_into_outfit_colours(client: AsyncClient, db_session):
    auth = await _register(client, "style-colour@test.com")
    await _seed_colour(db_session, "style-colour@test.com")

    body = (await client.get("/api/v1/style/outfits", headers=auth)).json()
    assert body["personalisedWith"]["season"] == "deep_winter"
    assert body["outfits"][0]["colours"]["main"], "the season fills the outfit palette"
    assert "colour analysis" not in body["couldImproveWith"]


@pytest.mark.asyncio
async def test_updating_preferences_changes_the_recommendations(client: AsyncClient):
    auth = await _register(client, "style-updates@test.com")
    before = (await client.get("/api/v1/style/garments?category=dresses", headers=auth)).json()

    await client.put("/api/v1/style/profile",
                     json={"bodyType": "pear", "aesthetics": ["traditional"]}, headers=auth)
    after = (await client.get("/api/v1/style/garments?category=dresses", headers=auth)).json()

    assert [g["key"] for g in before["garments"]] != [g["key"] for g in after["garments"]]
    assert after["personalisedWith"]["bodyType"] == "pear"


@pytest.mark.asyncio
async def test_no_user_is_pushed_into_a_cultural_category(client: AsyncClient):
    auth = await _register(client, "style-culture@test.com")
    body = (await client.get("/api/v1/style/garments", headers=auth)).json()
    regions = {g["region"] for g in body["garments"]}
    assert {"indian", "global"} <= regions, "both traditions offered by default"


@pytest.mark.asyncio
async def test_western_casual_and_indian_traditional_are_both_available_to_one_user(
        client: AsyncClient):
    auth = await _register(client, "style-both@test.com")
    await client.put("/api/v1/style/profile",
                     json={"culturalPreferences": ["indian"]}, headers=auth)

    # Stating a preference orders results; it does not remove the other tradition.
    body = (await client.get("/api/v1/style/garments", headers=auth)).json()
    assert {g["region"] for g in body["garments"]} >= {"indian", "global"}


# -------------------------------------------------------- saved inspiration

@pytest.mark.asyncio
async def test_saving_an_outfit_uses_the_existing_passport_looks(client: AsyncClient):
    auth = await _register(client, "style-save@test.com")
    outfits = (await client.get("/api/v1/style/outfits", headers=auth)).json()["outfits"]
    outfit = outfits[0]

    saved = await client.post("/api/v1/passport/looks", json={
        "name": outfit["name"], "kind": "outfit", "status": "want_to_try",
        "payload": {"outfit": outfit["key"], "pieces": [p["key"] for p in outfit["pieces"]]},
    }, headers=auth)
    assert saved.status_code in (200, 201), saved.text

    passport = (await client.get("/api/v1/passport", headers=auth)).json()
    assert passport["journey"]["savedLooks"] >= 1
    looks = (await client.get("/api/v1/passport/looks", headers=auth)).json()
    assert any(look["name"] == outfit["name"] for look in looks)
    assert all(look["kind"] == "outfit" for look in looks)


# ------------------------------------------------------------- the journey

@pytest.mark.asyncio
async def test_the_full_discover_my_style_journey(client: AsyncClient, db_session):
    """The ten-step journey from the spec, end to end."""
    email = "style-journey@test.com"
    auth = await _register(client, email)
    await _seed_colour(db_session, email)

    # 1. Open Discover My Style.
    profile = (await client.get("/api/v1/style/profile", headers=auth)).json()
    assert profile["completion"] == 0.0

    # 2. Select Pear.
    await client.put("/api/v1/style/profile", json={"bodyType": "pear"}, headers=auth)

    # 3. Choose Minimalist and Indo-Western.
    await client.put("/api/v1/style/profile",
                     json={"aesthetics": ["minimalist", "indo_western"]}, headers=auth)

    # 4. Choose preferred fits.
    await client.put("/api/v1/style/profile",
                     json={"fitPreference": "relaxed",
                           "silhouettePreferences": ["a_line", "wide_leg"]}, headers=auth)

    # 5. Preferences saved.
    saved = (await client.get("/api/v1/style/profile", headers=auth)).json()
    assert saved["bodyType"] == "pear"
    assert saved["aesthetics"] == ["minimalist", "indo_western"]
    assert saved["completion"] > 0.3

    # 6. Outfit recommendations update.
    outfits = (await client.get("/api/v1/style/outfits", headers=auth)).json()
    assert outfits["outfits"]
    assert outfits["personalisedWith"]["bodyType"] == "pear"
    assert outfits["couldImproveWith"] == [], "nothing left missing"

    # 7. Explore outfit colours.
    colours = (await client.get("/api/v1/style/colours", headers=auth)).json()
    assert colours["season"] == "deep_winter"
    assert any(p["suggestions"] for p in colours["pairings"])

    # 8. Save an outfit.
    outfit = outfits["outfits"][0]
    await client.post("/api/v1/passport/looks", json={
        "name": outfit["name"], "kind": "outfit", "status": "want_to_try",
        "payload": {"outfit": outfit["key"]},
    }, headers=auth)

    # 9. It appears in the Passport.
    passport = (await client.get("/api/v1/passport", headers=auth)).json()
    assert passport["journey"]["savedLooks"] >= 1

    # 10. Beauty Journey reflects the activity.
    kinds = [a["kind"] for a in passport["timeline"]]
    assert "style_profile" in kinds
    assert "look_saved" in kinds or passport["journey"]["savedLooks"] >= 1

    # 11. It survives a fresh session (a new token for the same account).
    login = await client.post("/api/v1/auth/login",
                              json={"email": email, "password": "password123"})
    fresh = {"Authorization": f"Bearer {login.json()['access_token']}"}
    again = (await client.get("/api/v1/style/profile", headers=fresh)).json()
    assert again["bodyType"] == "pear"
    assert again["aesthetics"] == ["minimalist", "indo_western"]


@pytest.mark.asyncio
async def test_the_journey_without_a_body_type_or_colour_analysis(client: AsyncClient):
    """The same journey for someone who declines both."""
    auth = await _register(client, "style-journey-optout@test.com")

    await client.put("/api/v1/style/profile",
                     json={"bodyType": "unsure", "aesthetics": ["casual"],
                           "fitPreference": "relaxed"}, headers=auth)

    outfits = (await client.get("/api/v1/style/outfits", headers=auth)).json()
    assert outfits["outfits"], "opting out must not empty the experience"
    assert outfits["personalisedWith"]["season"] is None
    assert "colour analysis" in outfits["couldImproveWith"]
    # No outfit claims a colour it does not have.
    assert all(o["colours"]["main"] == [] for o in outfits["outfits"])


@pytest.mark.asyncio
async def test_style_preferences_appear_in_the_beauty_passport(client: AsyncClient):
    """Part 12: the style profile is part of the shared Passport, not a silo."""
    auth = await _register(client, "style-passport@test.com")

    before = (await client.get("/api/v1/passport", headers=auth)).json()
    style_keys = {"body_type", "aesthetics", "fit_preference", "silhouettes",
                  "cultural_preferences"}
    present = {a["key"] for a in before["attributes"]}
    assert style_keys <= present, "every style field is a Passport attribute"
    assert all(a["status"] == "missing" for a in before["attributes"]
               if a["key"] in style_keys)
    # Each gap names where to fill it.
    for attribute in before["attributes"]:
        if attribute["key"] in style_keys:
            assert attribute["action"]["route"].startswith("/style/")

    await client.put("/api/v1/style/profile", json={
        "bodyType": "hourglass",
        "aesthetics": ["classic"],
        "fitPreference": "semi-fitted",
        "silhouettePreferences": ["wrap"],
        "culturalPreferences": ["indian", "global"],
    }, headers=auth)

    after = (await client.get("/api/v1/passport", headers=auth)).json()
    filled = {a["key"]: a for a in after["attributes"]}
    for key in style_keys:
        assert filled[key]["status"] == "present", key
    assert after["completion"] > before["completion"]
    assert "photograph" in (filled["body_type"]["detail"] or "")


@pytest.mark.asyncio
async def test_there_is_only_one_saved_items_system(client: AsyncClient):
    """Saving from Style writes the same SavedLook the Passport reads."""
    auth = await _register(client, "style-one-store@test.com")
    outfit = (await client.get("/api/v1/style/outfits", headers=auth)).json()["outfits"][0]

    await client.post("/api/v1/passport/looks", json={
        "name": outfit["name"], "kind": "outfit", "status": "want_to_try",
        "payload": {"outfit": outfit["key"]},
    }, headers=auth)

    looks = (await client.get("/api/v1/passport/looks?kind=outfit", headers=auth)).json()
    assert len(looks) == 1
    assert looks[0]["payload"]["outfit"] == outfit["key"]

    # And the journey counts it once, not twice.
    passport = (await client.get("/api/v1/passport", headers=auth)).json()
    assert passport["journey"]["savedLooks"] == 1
