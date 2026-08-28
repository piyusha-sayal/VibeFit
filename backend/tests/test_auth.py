import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_register_success(client: AsyncClient):
    resp = await client.post("/api/v1/auth/register", json={"name": "Alice", "email": "alice@test.com", "password": "password123"})
    assert resp.status_code == 201
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data


@pytest.mark.asyncio
async def test_register_duplicate_email(client: AsyncClient):
    payload = {"name": "Bob", "email": "bob@test.com", "password": "password123"}
    await client.post("/api/v1/auth/register", json=payload)
    resp = await client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 409


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={"name": "Carol", "email": "carol@test.com", "password": "password123"})
    resp = await client.post("/api/v1/auth/login", json={"email": "carol@test.com", "password": "password123"})
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={"name": "Dave", "email": "dave@test.com", "password": "password123"})
    resp = await client.post("/api/v1/auth/login", json={"email": "dave@test.com", "password": "wrongpass"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_get_me(client: AsyncClient):
    reg = await client.post("/api/v1/auth/register", json={"name": "Eve", "email": "eve@test.com", "password": "password123"})
    token = reg.json()["access_token"]
    resp = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json()["email"] == "eve@test.com"
