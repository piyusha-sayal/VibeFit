"""When is onboarding finished?

Routing depends on this answer, and getting it wrong is visible: a returning
user sent back through onboarding, or a new one dropped into an empty home
screen. "Some answers exist" cannot tell a finished run from an abandoned one,
so the client says so explicitly — while rows written by the older client,
which only ever sent primary_goal, keep the meaning they already had.
"""
from datetime import datetime

import pytest
from httpx import AsyncClient

PASSWORD = "password123"


def _instant(iso: str) -> datetime:
    return datetime.fromisoformat(iso).replace(tzinfo=None)


async def _register(client: AsyncClient, email: str) -> dict:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Onboard", "email": email,
                                  "password": PASSWORD})
    assert reg.status_code == 201, reg.text
    return {"Authorization": f"Bearer {reg.json()['access_token']}"}


@pytest.mark.asyncio
async def test_a_new_account_has_no_onboarding_record(client):
    auth = await _register(client, "onboard-new@example.com")
    response = await client.get("/api/v1/profile/onboarding", headers=auth)
    # 404 is how the app tells a new user from a returning one.
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_partial_answers_do_not_count_as_finished(client):
    auth = await _register(client, "onboard-partial@example.com")

    saved = await client.post("/api/v1/profile/onboarding", headers=auth,
                              json={"areas_of_interest": ["color", "hair"]})

    assert saved.status_code == 201
    assert saved.json()["completed_at"] is None
    assert saved.json()["areas_of_interest"] == ["color", "hair"]


@pytest.mark.asyncio
async def test_the_client_says_when_it_is_finished(client):
    auth = await _register(client, "onboard-done@example.com")
    await client.post("/api/v1/profile/onboarding", headers=auth,
                      json={"areas_of_interest": ["color"]})

    done = await client.post("/api/v1/profile/onboarding", headers=auth,
                             json={"completed": True})

    assert done.json()["completed_at"] is not None
    # The directive is not a column and must not be echoed back as one.
    assert "completed" not in done.json() or done.json().get("completed") is None
    # Earlier answers survive a save that only carries the directive.
    assert done.json()["areas_of_interest"] == ["color"]


@pytest.mark.asyncio
async def test_a_legacy_row_is_still_finished(client):
    """The older client sent primary_goal and nothing else."""
    auth = await _register(client, "onboard-legacy@example.com")

    saved = await client.post("/api/v1/profile/onboarding", headers=auth,
                              json={"primary_goal": "everyday_refresh"})

    assert saved.json()["completed_at"] is not None


@pytest.mark.asyncio
async def test_completion_is_not_moved_by_later_edits(client):
    auth = await _register(client, "onboard-stable@example.com")
    first = await client.post("/api/v1/profile/onboarding", headers=auth,
                              json={"completed": True})
    stamp = first.json()["completed_at"]

    again = await client.post("/api/v1/profile/onboarding", headers=auth,
                              json={"style_preferences": ["Minimalist"]})

    # Compared as instants, not as strings: SQLite drops the timezone on a
    # reload, so whether the second response carries "+00:00" depends on
    # whether the row came from the identity map or the database. Postgres is
    # consistent; the assertion should not depend on which one answered.
    assert _instant(again.json()["completed_at"]) == _instant(stamp)


@pytest.mark.asyncio
async def test_saving_nothing_new_does_not_erase_what_is_there(client):
    """Skipping a step must not write a null over an earlier answer."""
    auth = await _register(client, "onboard-skip@example.com")
    await client.post("/api/v1/profile/onboarding", headers=auth,
                      json={"style_preferences": ["Classic"],
                            "areas_of_interest": ["makeup"]})

    partial = await client.post("/api/v1/profile/onboarding", headers=auth,
                                json={"skipped_fields": ["market"]})

    assert partial.json()["style_preferences"] == ["Classic"]
    assert partial.json()["areas_of_interest"] == ["makeup"]
    assert partial.json()["skipped_fields"] == ["market"]


@pytest.mark.asyncio
async def test_onboarding_is_private_to_its_owner(client):
    mine = await _register(client, "onboard-mine@example.com")
    theirs = await _register(client, "onboard-theirs@example.com")
    await client.post("/api/v1/profile/onboarding", headers=mine,
                      json={"areas_of_interest": ["fashion"], "completed": True})

    other = await client.get("/api/v1/profile/onboarding", headers=theirs)

    assert other.status_code == 404
