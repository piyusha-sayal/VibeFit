"""The 18+ product-eligibility confirmation.

A statement, not proof of age: no birth date is collected. What the server
keeps is when the confirmation was first made, so a returning user on a new
phone is not asked again and the record survives in the account export.
"""
import pytest
from httpx import AsyncClient


async def _register(client: AsyncClient, email: str) -> dict:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Eligible", "email": email,
                                  "password": "password123"})
    assert reg.status_code == 201, reg.text
    return {"Authorization": f"Bearer {reg.json()['access_token']}"}


@pytest.mark.asyncio
async def test_new_account_has_not_confirmed(client: AsyncClient):
    headers = await _register(client, "elig-new@example.com")
    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.status_code == 200
    assert me.json()["age_confirmed_at"] is None


@pytest.mark.asyncio
async def test_confirmation_is_recorded_and_reported(client: AsyncClient):
    headers = await _register(client, "elig-confirm@example.com")
    res = await client.post("/api/v1/privacy/eligibility", headers=headers)
    assert res.status_code == 200, res.text
    confirmed_at = res.json()["age_confirmed_at"]
    assert confirmed_at

    me = await client.get("/api/v1/auth/me", headers=headers)
    assert me.json()["age_confirmed_at"] == confirmed_at


@pytest.mark.asyncio
async def test_repeat_confirmation_keeps_the_first_timestamp(client: AsyncClient):
    headers = await _register(client, "elig-repeat@example.com")
    first = (await client.post("/api/v1/privacy/eligibility", headers=headers)).json()
    second = (await client.post("/api/v1/privacy/eligibility", headers=headers)).json()
    assert second["age_confirmed_at"] == first["age_confirmed_at"]


@pytest.mark.asyncio
async def test_confirmation_requires_a_session(client: AsyncClient):
    res = await client.post("/api/v1/privacy/eligibility")
    assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_export_includes_the_confirmation(client: AsyncClient):
    headers = await _register(client, "elig-export@example.com")
    await client.post("/api/v1/privacy/eligibility", headers=headers)
    export = await client.get("/api/v1/privacy/export", headers=headers)
    assert export.status_code == 200, export.text
    assert export.json()["account"]["age_confirmed_at"]
