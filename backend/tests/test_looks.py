"""Create My Look through the API, including the four Phase 5 journeys.

These exercise the real endpoints against a real database. A screen rendering
is not evidence a feature works; a saved look that reopens with the same
components is.
"""
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from models.analysis import Analysis
from models.user import User


async def _register(client: AsyncClient, email: str) -> dict:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Look Test", "email": email, "password": "password123"})
    assert reg.status_code == 201, reg.text
    return {"Authorization": f"Bearer {reg.json()['access_token']}"}


async def _seed_analysis(db, email: str) -> None:
    user = (await db.execute(select(User).where(User.email == email))).scalars().first()
    db.add(Analysis(
        user_id=user.id, image_url="local://test", status="complete",
        color_analysis={"skinUndertone": "warm", "contrastLevel": "medium",
                        "depth": "medium", "chroma": "muted", "skinColor": "#c99a6e"},
        face_analysis={"shape": "oval"},
        hair_analysis={"texture": "wavy"},
        quality={"acceptable": True},
    ))
    await db.commit()


async def _generate(client, auth, **brief) -> dict:
    response = await client.post("/api/v1/looks/generate", headers=auth, json=brief)
    assert response.status_code == 200, response.text
    return response.json()


# ------------------------------------------------------------------- access

@pytest.mark.asyncio
async def test_look_endpoints_require_authentication(client: AsyncClient):
    for path in ("/api/v1/looks/context", "/api/v1/looks/drafts", "/api/v1/looks/saved"):
        assert (await client.get(path)).status_code in (401, 403), path
    assert (await client.post("/api/v1/looks/generate", json={})).status_code in (401, 403)


@pytest.mark.asyncio
async def test_options_need_no_profile_and_hardcode_nothing_in_the_client(client: AsyncClient):
    body = (await client.get("/api/v1/looks/options")).json()

    assert len(body["occasions"]) >= 12
    assert len(body["structures"]) >= 10
    assert "not a prediction" in body["visualisationNote"]
    assert {s["region"] for s in body["structures"]} == {"indian", "global"}


# ---------------------------------------------------- level 1: no analyses

@pytest.mark.asyncio
async def test_a_brand_new_user_can_create_a_look_with_no_analysis(client: AsyncClient):
    auth = await _register(client, "look-quick@test.com")

    body = await _generate(client, auth, occasion="office", aesthetics=["minimalist"])

    assert body["count"] >= 1
    assert body["context"]["level"] == "quick"
    look = body["looks"][0]
    assert look["outfit"]["pieces"], "a look with no profile must still have pieces"
    assert look["colours"]["best"] == []
    assert any(e["basis"] == "occasion" for e in look["explanations"])


@pytest.mark.asyncio
async def test_a_missing_profile_is_named_rather_than_filled(client: AsyncClient):
    auth = await _register(client, "look-gaps@test.com")

    context = (await client.get("/api/v1/looks/context", headers=auth)).json()

    assert context["using"] == []
    labels = {gap["label"] for gap in context["missing"]}
    assert "Colour analysis" in labels
    assert all(gap["route"].startswith("/") for gap in context["missing"])


# ------------------------------------------- level 2 and 3: real personalisation

@pytest.mark.asyncio
async def test_a_personalised_look_uses_the_real_palette_and_says_so(
        client: AsyncClient, db_session):
    auth = await _register(client, "look-personal@test.com")
    await _seed_analysis(db_session, "look-personal@test.com")

    body = await _generate(client, auth, occasion="indian_wedding")
    look = body["looks"][0]

    assert body["context"]["level"] in ("personalised", "full")
    assert look["colours"]["seasonLabel"]
    assert any(e["basis"] == "personal_colour" for e in look["explanations"])
    assert look["lipstick"]["offered"] is True
    assert all(piece["colour"] for piece in look["outfit"]["pieces"])


@pytest.mark.asyncio
async def test_a_user_can_exclude_one_attribute_from_one_look_only(
        client: AsyncClient, db_session):
    auth = await _register(client, "look-exclude@test.com")
    await _seed_analysis(db_session, "look-exclude@test.com")

    without = await _generate(client, auth, occasion="party", exclude=["personal_colour"])
    assert without["looks"][0]["colours"]["best"] == []
    assert without["context"]["excluded"] == ["personal_colour"]

    # The stored profile is untouched: the next look sees the palette again.
    again = await _generate(client, auth, occasion="party")
    assert again["looks"][0]["colours"]["best"]


@pytest.mark.asyncio
async def test_style_preferences_change_which_looks_come_back(client: AsyncClient):
    auth = await _register(client, "look-prefs@test.com")
    await client.put("/api/v1/style/profile", headers=auth,
                     json={"bodyType": "pear", "fitPreference": "relaxed",
                           "aesthetics": ["traditional"]})

    body = await _generate(client, auth, occasion="festival")

    assert body["context"]["level"] in ("personalised", "full")
    using = {entry["key"] for entry in body["context"]["using"]}
    assert "body_type" in using and "aesthetics" in using


@pytest.mark.asyncio
async def test_declining_a_body_type_still_produces_useful_looks(client: AsyncClient):
    auth = await _register(client, "look-optout@test.com")
    await client.put("/api/v1/style/profile", headers=auth,
                     json={"bodyType": "uncategorised", "fitPreference": "relaxed",
                           "silhouettePreferences": ["a_line"]})

    body = await _generate(client, auth, occasion="everyday")
    look = body["looks"][0]

    assert look["outfit"]["pieces"]
    assert not any("shape you selected" in e["text"] for e in look["explanations"])
    assert any("fit" in e["text"].lower() for e in look["explanations"])


# -------------------------------------------------------- component editing

@pytest.mark.asyncio
async def test_alternatives_are_listed_for_a_slot_without_rebuilding_the_look(
        client: AsyncClient):
    auth = await _register(client, "look-alts@test.com")
    look = (await _generate(client, auth, occasion="office"))["looks"][0]
    slot = look["outfit"]["pieces"][0]["slot"]

    response = await client.get("/api/v1/looks/alternatives", headers=auth, params={
        "component": "outfit", "structure": look["structure"], "slot": slot,
        "occasion": "office",
    })
    body = response.json()

    assert response.status_code == 200, response.text
    assert body["count"] >= 1
    assert all("key" in option and "name" in option for option in body["options"])


@pytest.mark.asyncio
async def test_swapping_a_component_preserves_every_other_selection(client: AsyncClient):
    auth = await _register(client, "look-swap@test.com")
    look = (await _generate(client, auth, occasion="office"))["looks"][0]

    response = await client.post("/api/v1/looks/apply", headers=auth, json={
        "composition": look, "component": "hair", "selection": {"key": "long_layers"},
    })
    updated = response.json()["composition"]

    assert response.json()["changed"] is True
    assert updated["hair"]["style"] == "long_layers"
    assert updated["outfit"] == look["outfit"]
    assert updated["makeup"] == look["makeup"]


@pytest.mark.asyncio
async def test_an_unknown_component_is_rejected(client: AsyncClient):
    auth = await _register(client, "look-badcomponent@test.com")
    look = (await _generate(client, auth, occasion="office"))["looks"][0]

    response = await client.post("/api/v1/looks/apply", headers=auth, json={
        "composition": look, "component": "shoes_and_socks", "selection": {},
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_an_unknown_item_reference_leaves_the_look_alone(client: AsyncClient):
    auth = await _register(client, "look-badkey@test.com")
    look = (await _generate(client, auth, occasion="office"))["looks"][0]

    body = (await client.post("/api/v1/looks/apply", headers=auth, json={
        "composition": look, "component": "hair", "selection": {"key": "not-real"},
    })).json()

    assert body["changed"] is False
    assert body["composition"] == look
    assert body["note"]


@pytest.mark.asyncio
async def test_a_composition_with_an_unknown_structure_is_refused(client: AsyncClient):
    auth = await _register(client, "look-badstructure@test.com")
    response = await client.post("/api/v1/looks/apply", headers=auth, json={
        "composition": {"structure": "spacesuit", "outfit": {"pieces": []}},
        "component": "hair", "selection": {"key": "bob"},
    })
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_a_smart_variation_changes_only_what_it_names(client: AsyncClient):
    auth = await _register(client, "look-shift@test.com")
    look = (await _generate(client, auth, occasion="wedding"))["looks"][0]

    body = (await client.post("/api/v1/looks/shift", headers=auth,
                              json={"composition": look, "kind": "softer_makeup"})).json()

    assert body["composition"]["outfit"] == look["outfit"]
    if body["changed"]:
        assert body["composition"]["makeup"]["aesthetic"] != look["makeup"]["aesthetic"]
    else:
        assert body["note"]


# -------------------------------------------------------------------- drafts

@pytest.mark.asyncio
async def test_a_draft_survives_leaving_the_builder(client: AsyncClient):
    auth = await _register(client, "look-draft@test.com")
    look = (await _generate(client, auth, occasion="date"))["looks"][0]

    created = (await client.post("/api/v1/looks/drafts", headers=auth,
                                 json={"composition": look, "name": "Friday"})).json()
    listed = (await client.get("/api/v1/looks/drafts", headers=auth)).json()

    assert listed["drafts"][0]["id"] == created["id"]
    assert listed["drafts"][0]["composition"]["structure"] == look["structure"]


@pytest.mark.asyncio
async def test_autosaving_a_draft_updates_it_rather_than_piling_up(client: AsyncClient):
    auth = await _register(client, "look-autosave@test.com")
    look = (await _generate(client, auth, occasion="date"))["looks"][0]

    first = (await client.post("/api/v1/looks/drafts", headers=auth,
                               json={"composition": look})).json()
    for _ in range(3):
        await client.post("/api/v1/looks/drafts", headers=auth,
                          json={"composition": look, "draftId": first["id"]})

    listed = (await client.get("/api/v1/looks/drafts", headers=auth)).json()
    assert len(listed["drafts"]) == 1


@pytest.mark.asyncio
async def test_a_draft_is_discarded_once_the_look_is_saved(client: AsyncClient):
    auth = await _register(client, "look-draftsave@test.com")
    look = (await _generate(client, auth, occasion="office"))["looks"][0]
    draft = (await client.post("/api/v1/looks/drafts", headers=auth,
                               json={"composition": look})).json()

    saved = await client.post("/api/v1/looks/save", headers=auth, json={
        "composition": look, "name": "Monday", "draftId": draft["id"],
    })

    assert saved.status_code == 201, saved.text
    assert (await client.get("/api/v1/looks/drafts", headers=auth)).json()["drafts"] == []


# --------------------------------------------------------------- saved looks

@pytest.mark.asyncio
async def test_a_saved_look_reopens_with_the_components_it_was_saved_with(
        client: AsyncClient):
    auth = await _register(client, "look-reopen@test.com")
    look = (await _generate(client, auth, occasion="party"))["looks"][0]
    chosen = (await client.post("/api/v1/looks/apply", headers=auth, json={
        "composition": look, "component": "jewellery",
        "selection": {"kind": "metal", "key": "silver"},
    })).json()["composition"]

    saved = (await client.post("/api/v1/looks/save", headers=auth,
                               json={"composition": chosen, "name": "Saturday"})).json()
    reopened = (await client.get(f"/api/v1/looks/{saved['id']}", headers=auth)).json()

    assert reopened["reconstructable"] is True
    assert reopened["editable"] is True
    assert reopened["unavailable"] == []
    assert reopened["composition"]["jewellery"]["metal"] == "silver"
    assert [p["key"] for p in reopened["composition"]["outfit"]["pieces"]] == \
           [p["key"] for p in chosen["outfit"]["pieces"]]


@pytest.mark.asyncio
async def test_a_saved_look_keeps_a_selection_the_catalogue_has_since_lost(
        client: AsyncClient):
    auth = await _register(client, "look-stale@test.com")
    look = (await _generate(client, auth, occasion="office"))["looks"][0]
    stale = {
        **look,
        "outfit": {**look["outfit"], "pieces": [
            {**look["outfit"]["pieces"][0], "key": "retired_garment", "name": "Retired piece"},
            *look["outfit"]["pieces"][1:],
        ]},
    }
    saved = (await client.post("/api/v1/looks/save", headers=auth,
                               json={"composition": stale, "name": "Old"})).json()

    reopened = (await client.get(f"/api/v1/looks/{saved['id']}", headers=auth)).json()

    assert reopened["unavailable"][0]["key"] == "retired_garment"
    assert reopened["composition"]["outfit"]["pieces"][0]["name"] == "Retired piece"
    assert reopened["composition"]["outfit"]["pieces"][0]["available"] is False
    assert reopened["note"]


@pytest.mark.asyncio
async def test_saving_twice_with_one_token_creates_one_look(client: AsyncClient):
    auth = await _register(client, "look-idempotent@test.com")
    look = (await _generate(client, auth, occasion="office"))["looks"][0]
    payload = {"composition": look, "name": "Once", "clientToken": "token-abc"}

    first = (await client.post("/api/v1/looks/save", headers=auth, json=payload)).json()
    second = (await client.post("/api/v1/looks/save", headers=auth, json=payload)).json()

    assert first["created"] is True
    assert second["created"] is False
    assert first["id"] == second["id"]
    assert (await client.get("/api/v1/looks/saved", headers=auth)).json()["count"] == 1


@pytest.mark.asyncio
async def test_editing_a_saved_look_rewrites_it_in_place(client: AsyncClient):
    auth = await _register(client, "look-edit@test.com")
    look = (await _generate(client, auth, occasion="date"))["looks"][0]
    saved = (await client.post("/api/v1/looks/save", headers=auth,
                               json={"composition": look, "name": "Before"})).json()

    edited = (await client.post("/api/v1/looks/apply", headers=auth, json={
        "composition": look, "component": "lipstick",
        "selection": {"key": "#7a1f2b", "name": "Deep berry"},
    })).json()["composition"]
    await client.patch(f"/api/v1/looks/{saved['id']}", headers=auth,
                       json={"name": "After", "composition": edited})

    reopened = (await client.get(f"/api/v1/looks/{saved['id']}", headers=auth)).json()
    assert reopened["name"] == "After"
    assert reopened["composition"]["lipstick"]["hex"] == "#7a1f2b"
    assert (await client.get("/api/v1/looks/saved", headers=auth)).json()["count"] == 1


@pytest.mark.asyncio
async def test_duplicating_a_look_never_touches_the_original(client: AsyncClient):
    auth = await _register(client, "look-dup@test.com")
    look = (await _generate(client, auth, occasion="wedding"))["looks"][0]
    original = (await client.post("/api/v1/looks/save", headers=auth,
                                  json={"composition": look, "name": "Original"})).json()

    copy = (await client.post(f"/api/v1/looks/{original['id']}/duplicate", headers=auth,
                              json={"name": "Variant", "clientToken": "dup-1"})).json()
    replay = (await client.post(f"/api/v1/looks/{original['id']}/duplicate", headers=auth,
                                json={"name": "Variant", "clientToken": "dup-1"})).json()

    assert copy["id"] != original["id"]
    assert replay["id"] == copy["id"] and replay["created"] is False
    unchanged = (await client.get(f"/api/v1/looks/{original['id']}", headers=auth)).json()
    assert unchanged["name"] == "Original"


@pytest.mark.asyncio
async def test_a_look_can_be_deleted(client: AsyncClient):
    auth = await _register(client, "look-delete@test.com")
    look = (await _generate(client, auth, occasion="office"))["looks"][0]
    saved = (await client.post("/api/v1/looks/save", headers=auth,
                               json={"composition": look})).json()

    assert (await client.delete(f"/api/v1/passport/looks/{saved['id']}",
                                headers=auth)).status_code == 204
    assert (await client.get(f"/api/v1/looks/{saved['id']}", headers=auth)).status_code == 404


@pytest.mark.asyncio
async def test_one_user_cannot_read_or_edit_another_users_look(client: AsyncClient):
    owner = await _register(client, "look-owner@test.com")
    intruder = await _register(client, "look-intruder@test.com")
    look = (await _generate(client, owner, occasion="office"))["looks"][0]
    saved = (await client.post("/api/v1/looks/save", headers=owner,
                               json={"composition": look})).json()

    assert (await client.get(f"/api/v1/looks/{saved['id']}",
                             headers=intruder)).status_code == 404
    assert (await client.patch(f"/api/v1/looks/{saved['id']}", headers=intruder,
                               json={"name": "Mine now"})).status_code == 404
    assert (await client.post(f"/api/v1/looks/{saved['id']}/duplicate", headers=intruder,
                              json={})).status_code == 404


# ---------------------------------------------------------------- comparison

@pytest.mark.asyncio
async def test_three_looks_can_be_compared_without_altering_them(client: AsyncClient):
    auth = await _register(client, "look-compare@test.com")
    generated = await _generate(client, auth, occasion="indian_wedding", limit=3)
    ids = []
    for index, look in enumerate(generated["looks"]):
        saved = (await client.post("/api/v1/looks/save", headers=auth, json={
            "composition": look, "name": f"Option {index + 1}",
        })).json()
        ids.append(saved["id"])

    body = (await client.get("/api/v1/looks/compare", headers=auth,
                             params={"ids": ",".join(ids)})).json()

    assert [entry["id"] for entry in body["looks"]] == ids
    assert {row["key"] for row in body["rows"]} >= {"outfit", "hair", "makeup", "jewellery"}
    still_there = (await client.get(f"/api/v1/looks/{ids[0]}", headers=auth)).json()
    assert still_there["name"] == "Option 1"


@pytest.mark.asyncio
async def test_comparing_someone_elses_look_is_refused(client: AsyncClient):
    owner = await _register(client, "compare-owner@test.com")
    intruder = await _register(client, "compare-intruder@test.com")
    look = (await _generate(client, owner, occasion="office"))["looks"][0]
    mine = (await client.post("/api/v1/looks/save", headers=owner,
                              json={"composition": look})).json()
    theirs = (await client.post("/api/v1/looks/save", headers=intruder,
                                json={"composition": look})).json()

    response = await client.get("/api/v1/looks/compare", headers=intruder,
                                params={"ids": f"{theirs['id']},{mine['id']}"})
    assert response.status_code == 404


# ------------------------------------------------------------------ feedback

@pytest.mark.asyncio
async def test_a_rejected_item_is_not_offered_first_again(client: AsyncClient):
    auth = await _register(client, "look-feedback@test.com")
    look = (await _generate(client, auth, occasion="office"))["looks"][0]
    top = next(p for p in look["outfit"]["pieces"] if p["role"] == "main")

    await client.post("/api/v1/looks/feedback", headers=auth, json={
        "component": "outfit", "itemKey": top["key"], "verdict": "not_my_style",
    })
    again = (await _generate(client, auth, occasion="office"))["looks"][0]
    new_top = next(p for p in again["outfit"]["pieces"] if p["role"] == "main")

    assert new_top["key"] != top["key"]


@pytest.mark.asyncio
async def test_repeating_feedback_updates_rather_than_duplicates(client: AsyncClient):
    auth = await _register(client, "look-feedback2@test.com")
    for verdict in ("not_my_style", "love"):
        await client.post("/api/v1/looks/feedback", headers=auth, json={
            "component": "hair", "itemKey": "bob", "verdict": verdict,
        })

    body = (await client.get("/api/v1/looks/feedback", headers=auth)).json()
    assert len(body["feedback"]) == 1
    assert body["feedback"][0]["verdict"] == "love"


@pytest.mark.asyncio
async def test_an_unknown_verdict_is_refused(client: AsyncClient):
    auth = await _register(client, "look-badverdict@test.com")
    response = await client.post("/api/v1/looks/feedback", headers=auth, json={
        "component": "hair", "itemKey": "bob", "verdict": "meh",
    })
    assert response.status_code == 422


# ------------------------------------------------------- passport and journey

@pytest.mark.asyncio
async def test_a_saved_look_reaches_the_passport_and_the_journey(client: AsyncClient):
    auth = await _register(client, "look-passport@test.com")
    look = (await _generate(client, auth, occasion="festival"))["looks"][0]
    saved = (await client.post("/api/v1/looks/save", headers=auth,
                               json={"composition": look, "name": "Diwali"})).json()

    passport = (await client.get("/api/v1/passport", headers=auth)).json()

    assert passport["journey"]["completeLooks"] == 1
    assert passport["recentLooks"][0]["id"] == saved["id"]
    assert passport["timeline"][0]["kind"] == "look_saved"
    assert passport["completionOf"] == "Beauty Passport attributes"


@pytest.mark.asyncio
async def test_editing_a_look_many_times_does_not_flood_the_timeline(client: AsyncClient):
    auth = await _register(client, "look-timeline@test.com")
    look = (await _generate(client, auth, occasion="date"))["looks"][0]
    draft = (await client.post("/api/v1/looks/drafts", headers=auth,
                               json={"composition": look})).json()
    for hex_code in ("#7a1f2b", "#a9432f", "#8e2f4a", "#b5542c", "#93304a"):
        edited = (await client.post("/api/v1/looks/apply", headers=auth, json={
            "composition": look, "component": "lipstick",
            "selection": {"key": hex_code, "name": "Trying"},
        })).json()["composition"]
        await client.post("/api/v1/looks/drafts", headers=auth,
                          json={"composition": edited, "draftId": draft["id"]})

    timeline = (await client.get("/api/v1/passport", headers=auth)).json()["timeline"]
    created_events = [e for e in timeline if e["kind"] == "look_created"]
    assert len(created_events) == 1


@pytest.mark.asyncio
async def test_marking_a_look_tried_is_recorded_and_counted(client: AsyncClient):
    auth = await _register(client, "look-tried@test.com")
    look = (await _generate(client, auth, occasion="office"))["looks"][0]
    saved = (await client.post("/api/v1/looks/save", headers=auth,
                               json={"composition": look, "name": "Monday"})).json()

    await client.patch(f"/api/v1/looks/{saved['id']}", headers=auth, json={"status": "tried"})
    passport = (await client.get("/api/v1/passport", headers=auth)).json()

    assert passport["journey"]["triedLooks"] == 1
    assert passport["timeline"][0]["kind"] == "look_tried"


@pytest.mark.asyncio
async def test_the_two_completion_numbers_are_labelled_differently(client: AsyncClient):
    auth = await _register(client, "look-completion@test.com")

    passport = (await client.get("/api/v1/passport", headers=auth)).json()
    style = (await client.get("/api/v1/style/profile", headers=auth)).json()

    assert passport["completionOf"] != style["completionOf"]
    assert passport["total"] != style["total"]


# --------------------------------------------------------------- collections

@pytest.mark.asyncio
async def test_a_look_can_be_added_to_and_removed_from_a_collection(client: AsyncClient):
    auth = await _register(client, "look-collection@test.com")
    look = (await _generate(client, auth, occasion="wedding"))["looks"][0]
    saved = (await client.post("/api/v1/looks/save", headers=auth,
                               json={"composition": look})).json()
    collection = (await client.post("/api/v1/passport/collections", headers=auth,
                                    json={"name": "Wedding season"})).json()

    added = await client.post(f"/api/v1/passport/collections/{collection['id']}/looks",
                              headers=auth, json={"lookId": saved["id"]})
    assert added.status_code == 201
    listed = (await client.get("/api/v1/passport/collections", headers=auth)).json()
    assert listed["collections"][0]["lookIds"] == [saved["id"]]

    await client.delete(
        f"/api/v1/passport/collections/{collection['id']}/looks/{saved['id']}", headers=auth)
    after = (await client.get("/api/v1/passport/collections", headers=auth)).json()
    assert after["collections"][0]["count"] == 0
    # Removing from a collection does not delete the look.
    assert (await client.get(f"/api/v1/looks/{saved['id']}", headers=auth)).status_code == 200


@pytest.mark.asyncio
async def test_a_collection_cannot_hold_someone_elses_look(client: AsyncClient):
    owner = await _register(client, "coll-owner@test.com")
    intruder = await _register(client, "coll-intruder@test.com")
    look = (await _generate(client, owner, occasion="office"))["looks"][0]
    theirs = (await client.post("/api/v1/looks/save", headers=owner,
                                json={"composition": look})).json()
    mine = (await client.post("/api/v1/passport/collections", headers=intruder,
                              json={"name": "Mine"})).json()

    response = await client.post(f"/api/v1/passport/collections/{mine['id']}/looks",
                                 headers=intruder, json={"lookId": theirs["id"]})
    assert response.status_code == 404


# ------------------------------------------------------------- full journeys

@pytest.mark.asyncio
async def test_journey_new_user_creates_edits_saves_and_reopens(client: AsyncClient):
    """E2E 1: register, skip every analysis, build a look, save it, reopen it."""
    auth = await _register(client, "journey-new@test.com")

    generated = await _generate(client, auth, occasion="office", aesthetics=["minimalist"])
    assert generated["context"]["level"] == "quick"
    look = generated["looks"][0]

    slot = look["outfit"]["pieces"][0]["slot"]
    options = (await client.get("/api/v1/looks/alternatives", headers=auth, params={
        "component": "outfit", "structure": look["structure"], "slot": slot,
        "occasion": "office",
    })).json()["options"]
    replacement = next(o for o in options
                       if o["key"] != look["outfit"]["pieces"][0]["key"])
    edited = (await client.post("/api/v1/looks/apply", headers=auth, json={
        "composition": look, "component": "outfit",
        "selection": {"slot": slot, "key": replacement["key"]},
    })).json()["composition"]

    saved = (await client.post("/api/v1/looks/save", headers=auth, json={
        "composition": edited, "name": "First day", "clientToken": "journey-1",
    })).json()

    reopened = (await client.get(f"/api/v1/looks/{saved['id']}", headers=auth)).json()
    assert reopened["name"] == "First day"
    assert reopened["composition"]["outfit"]["pieces"][0]["key"] == replacement["key"]


@pytest.mark.asyncio
async def test_journey_personalised_user_compares_and_saves(client: AsyncClient, db_session):
    """E2E 2: a full profile, an Indian wedding, swaps, a comparison, a save."""
    auth = await _register(client, "journey-full@test.com")
    await _seed_analysis(db_session, "journey-full@test.com")
    await client.put("/api/v1/style/profile", headers=auth, json={
        "bodyType": "pear", "fitPreference": "relaxed",
        "aesthetics": ["traditional", "elegant"], "silhouettePreferences": ["a_line"],
    })

    generated = await _generate(client, auth, occasion="indian_wedding", limit=3)
    assert generated["count"] >= 2
    assert generated["context"]["level"] == "full"

    first = generated["looks"][0]
    with_hair = (await client.post("/api/v1/looks/apply", headers=auth, json={
        "composition": first, "component": "hair", "selection": {"key": "long_curls"},
    })).json()["composition"]
    with_jewellery = (await client.post("/api/v1/looks/apply", headers=auth, json={
        "composition": with_hair, "component": "jewellery",
        "selection": {"kind": "earrings", "key": "chandbali"},
    })).json()["composition"]

    assert with_jewellery["hair"]["style"] == "long_curls"
    assert with_jewellery["outfit"] == first["outfit"]

    ids = []
    for index, look in enumerate([with_jewellery, generated["looks"][1]]):
        saved = (await client.post("/api/v1/looks/save", headers=auth, json={
            "composition": look, "name": f"Sangeet {index + 1}",
        })).json()
        ids.append(saved["id"])

    comparison = (await client.get("/api/v1/looks/compare", headers=auth,
                                   params={"ids": ",".join(ids)})).json()
    assert len(comparison["looks"]) == 2

    passport = (await client.get("/api/v1/passport", headers=auth)).json()
    assert passport["journey"]["completeLooks"] == 2
    assert passport["favouriteAesthetics"]


@pytest.mark.asyncio
async def test_journey_edit_a_saved_look_and_reopen_it(client: AsyncClient):
    """E2E 4: open a saved look, change the lipstick, save, reopen."""
    auth = await _register(client, "journey-edit@test.com")
    look = (await _generate(client, auth, occasion="party"))["looks"][0]
    saved = (await client.post("/api/v1/looks/save", headers=auth,
                               json={"composition": look, "name": "Saturday"})).json()

    opened = (await client.get(f"/api/v1/looks/{saved['id']}", headers=auth)).json()
    changed = (await client.post("/api/v1/looks/apply", headers=auth, json={
        "composition": opened["composition"], "component": "lipstick",
        "selection": {"key": "#5d1f2f", "name": "Oxblood"},
    })).json()["composition"]
    await client.patch(f"/api/v1/looks/{saved['id']}", headers=auth,
                       json={"composition": changed})

    again = (await client.get(f"/api/v1/looks/{saved['id']}", headers=auth)).json()
    assert again["composition"]["lipstick"]["name"] == "Oxblood"
    assert again["composition"]["hair"] == look["hair"]
    assert again["composition"]["outfit"] == look["outfit"]
