"""Renaming the account from Settings."""
import pytest
from httpx import AsyncClient


async def _register(client: AsyncClient, email: str) -> dict:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Before", "email": email, "password": "password123"})
    assert reg.status_code == 201, reg.text
    return {"Authorization": f"Bearer {reg.json()['access_token']}"}


@pytest.mark.asyncio
async def test_rename_is_saved(client: AsyncClient):
    headers = await _register(client, "rename-ok@example.com")
    res = await client.patch("/api/v1/users/me", headers=headers, json={"name": "  Priya  "})
    assert res.status_code == 200
    assert res.json()["name"] == "Priya"


@pytest.mark.asyncio
async def test_overlong_name_is_rejected(client: AsyncClient):
    headers = await _register(client, "rename-long@example.com")
    res = await client.patch("/api/v1/users/me", headers=headers, json={"name": "x" * 61})
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_blank_name_keeps_the_old_one(client: AsyncClient):
    headers = await _register(client, "rename-blank@example.com")
    res = await client.patch("/api/v1/users/me", headers=headers, json={"name": "   "})
    assert res.status_code == 200
    assert res.json()["name"] == "Before"
