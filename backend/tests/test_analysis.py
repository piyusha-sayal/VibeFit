import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock


@pytest.mark.asyncio
async def test_get_latest_no_analysis(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={"name": "Test", "email": "t@test.com", "password": "password123"})
    token = reg.json()["access_token"]
    resp = await client.get("/api/v1/analysis/latest", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_list_analyses_empty(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={"name": "List", "email": "list@test.com", "password": "password123"})
    token = reg.json()["access_token"]
    resp = await client.get("/api/v1/analysis", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.asyncio
async def test_analysis_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/analysis/latest")
    assert resp.status_code == 403
