"""Action Plan endpoints: generation, feedback, and stability across regeneration."""
import pytest
from httpx import AsyncClient


async def _register(client: AsyncClient, email: str) -> dict:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Plan Test", "email": email, "password": "password123"})
    assert reg.status_code == 201, reg.text
    return {"Authorization": f"Bearer {reg.json()['access_token']}"}


@pytest.mark.asyncio
async def test_plan_requires_auth(client: AsyncClient):
    res = await client.get("/api/v1/plan")
    assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_plan_empty_state_explains_why(client: AsyncClient):
    auth = await _register(client, "plan-empty@test.com")
    res = await client.get("/api/v1/plan", headers=auth)
    assert res.status_code == 200
    body = res.json()
    assert body["top_actions"] == []
    assert body["profile_complete"] is False
    assert body["limitations_summary"]


@pytest.mark.asyncio
async def test_plan_generates_after_onboarding_and_scan(client: AsyncClient, _jpeg):
    auth = await _register(client, "plan-full@test.com")
    await client.post("/api/v1/profile/onboarding", headers=auth,
                      json={"primary_goal": "haircut", "areas_of_interest": ["hair"]})
    up = await client.post("/api/v1/analysis/upload", headers=auth,
                           files={"file": ("face.jpg", _jpeg(), "image/jpeg")})
    assert up.status_code == 201

    res = await client.get("/api/v1/plan", headers=auth)
    assert res.status_code == 200
    body = res.json()
    assert len(body["top_actions"]) <= 3
    for action in body["top_actions"]:
        assert action["why"]
        assert action["confidence_label"]
        assert action["category"] == "hair"  # filtered to the stated area of interest


@pytest.mark.asyncio
async def test_plan_action_ids_and_feedback_survive_regeneration(client: AsyncClient, _jpeg):
    auth = await _register(client, "plan-stable@test.com")
    await client.post("/api/v1/profile/onboarding", headers=auth, json={"primary_goal": "haircut"})
    await client.post("/api/v1/analysis/upload", headers=auth,
                      files={"file": ("face.jpg", _jpeg(), "image/jpeg")})

    first = (await client.get("/api/v1/plan", headers=auth)).json()
    assert first["top_actions"], "expected at least one grounded action"
    action_id = first["top_actions"][0]["id"]

    fb = await client.post(f"/api/v1/plan/{action_id}/feedback", headers=auth,
                           json={"feedback_type": "saved"})
    assert fb.status_code == 201, fb.text

    second = (await client.get("/api/v1/plan", headers=auth)).json()
    second_ids = [a["id"] for a in second["top_actions"]]
    assert action_id in second_ids
    matching = next(a for a in second["top_actions"] if a["id"] == action_id)
    assert "saved" in matching["feedback"]


@pytest.mark.asyncio
async def test_feedback_rejects_unknown_type(client: AsyncClient, _jpeg):
    auth = await _register(client, "plan-badfeedback@test.com")
    await client.post("/api/v1/profile/onboarding", headers=auth, json={"primary_goal": "haircut"})
    await client.post("/api/v1/analysis/upload", headers=auth,
                      files={"file": ("face.jpg", _jpeg(), "image/jpeg")})
    plan = (await client.get("/api/v1/plan", headers=auth)).json()
    action_id = plan["top_actions"][0]["id"]

    res = await client.post(f"/api/v1/plan/{action_id}/feedback", headers=auth,
                            json={"feedback_type": "not-a-real-type"})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_feedback_rejects_action_owned_by_another_user(client: AsyncClient, _jpeg):
    auth_a = await _register(client, "plan-owner@test.com")
    auth_b = await _register(client, "plan-intruder@test.com")
    await client.post("/api/v1/profile/onboarding", headers=auth_a, json={"primary_goal": "haircut"})
    await client.post("/api/v1/analysis/upload", headers=auth_a,
                      files={"file": ("face.jpg", _jpeg(), "image/jpeg")})
    plan = (await client.get("/api/v1/plan", headers=auth_a)).json()
    action_id = plan["top_actions"][0]["id"]

    res = await client.post(f"/api/v1/plan/{action_id}/feedback", headers=auth_b,
                            json={"feedback_type": "saved"})
    assert res.status_code == 404
