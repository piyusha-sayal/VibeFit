"""Onboarding, Vibe Profile, and correction endpoints."""
import pytest
from httpx import AsyncClient


async def _register(client: AsyncClient, email: str) -> dict:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Profile Test", "email": email, "password": "password123"})
    assert reg.status_code == 201, reg.text
    token = reg.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.asyncio
async def test_onboarding_requires_auth(client: AsyncClient):
    res = await client.get("/api/v1/profile/onboarding")
    assert res.status_code in (401, 403)


@pytest.mark.asyncio
async def test_onboarding_not_started_returns_404(client: AsyncClient):
    auth = await _register(client, "onb-empty@test.com")
    res = await client.get("/api/v1/profile/onboarding", headers=auth)
    assert res.status_code == 404


@pytest.mark.asyncio
async def test_onboarding_save_allows_skipping_optional_fields(client: AsyncClient):
    auth = await _register(client, "onb-partial@test.com")
    res = await client.post("/api/v1/profile/onboarding", headers=auth,
                            json={"primary_goal": "haircut", "skipped_fields": ["budget_range", "market"]})
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["primary_goal"] == "haircut"
    assert body["budget_range"] is None
    assert body["completed_at"] is not None  # primary_goal present -> marked complete


@pytest.mark.asyncio
async def test_onboarding_save_is_a_partial_upsert(client: AsyncClient):
    auth = await _register(client, "onb-upsert@test.com")
    await client.post("/api/v1/profile/onboarding", headers=auth,
                      json={"primary_goal": "color palette", "budget_range": "low"})
    res = await client.post("/api/v1/profile/onboarding", headers=auth,
                            json={"maintenance_tolerance": "low"})
    assert res.status_code == 201
    body = res.json()
    # first call's fields survive a second, partial save
    assert body["primary_goal"] == "color palette"
    assert body["budget_range"] == "low"
    assert body["maintenance_tolerance"] == "low"


@pytest.mark.asyncio
async def test_vibe_profile_empty_state_has_no_scan_no_onboarding(client: AsyncClient):
    auth = await _register(client, "vibe-empty@test.com")
    res = await client.get("/api/v1/profile/vibe", headers=auth)
    assert res.status_code == 200
    body = res.json()
    assert body["has_scan"] is False
    assert body["has_onboarding"] is False
    for attr in body["attributes"].values():
        assert attr["value"] is None
        assert attr["source"] == "none"
        assert attr["confidence"] == "unknown"


@pytest.mark.asyncio
async def test_vibe_profile_reflects_scan_with_measured_confidence(client: AsyncClient, _jpeg):
    auth = await _register(client, "vibe-scanned@test.com")
    up = await client.post("/api/v1/analysis/upload", headers=auth,
                           files={"file": ("face.jpg", _jpeg(), "image/jpeg")})
    assert up.status_code == 201, up.text

    res = await client.get("/api/v1/profile/vibe", headers=auth)
    assert res.status_code == 200
    body = res.json()
    assert body["has_scan"] is True
    face_shape = body["attributes"]["face_shape"]
    assert face_shape["source"] == "scan"
    assert face_shape["confidence"] in {"high", "usable_with_caution", "retake_recommended"}
    assert face_shape["original_value"] is None


@pytest.mark.asyncio
async def test_correction_overrides_display_value_without_erasing_scan(client: AsyncClient, _jpeg):
    auth = await _register(client, "vibe-corrected@test.com")
    up = await client.post("/api/v1/analysis/upload", headers=auth,
                           files={"file": ("face.jpg", _jpeg(), "image/jpeg")})
    scanned_shape = up.json()["face_analysis"]["shape"]

    cor = await client.post("/api/v1/profile/corrections", headers=auth,
                            json={"attribute_key": "face_shape", "corrected_value": "heart",
                                  "note": "I know my face shape better than this"})
    assert cor.status_code == 201, cor.text

    res = await client.get("/api/v1/profile/vibe", headers=auth)
    face_shape = res.json()["attributes"]["face_shape"]
    assert face_shape["value"] == "heart"
    assert face_shape["source"] == "user_correction"
    assert face_shape["confidence"] == "user_corrected"
    # the original scan value is preserved, not silently discarded
    assert face_shape["original_value"] == scanned_shape


@pytest.mark.asyncio
async def test_correction_requires_auth(client: AsyncClient):
    res = await client.post("/api/v1/profile/corrections",
                            json={"attribute_key": "face_shape", "corrected_value": "oval"})
    assert res.status_code in (401, 403)
