"""Firebase auth path: verify token -> auto-provision user -> authed request."""
import pytest
from unittest.mock import patch
from httpx import AsyncClient

from core.firebase_auth import verify_firebase_token
from core.config import settings


def test_verify_firebase_token_disabled_without_project_id():
    original = settings.firebase_project_id
    settings.firebase_project_id = ""
    try:
        assert verify_firebase_token("anything") is None
    finally:
        settings.firebase_project_id = original


def test_verify_firebase_token_rejects_bad_token():
    original = settings.firebase_project_id
    settings.firebase_project_id = "vibefit-a897e"
    try:
        # Not a real Google-signed JWT -> signature/format check fails -> None, no raise.
        assert verify_firebase_token("not-a-real-token") is None
    finally:
        settings.firebase_project_id = original


def test_verify_firebase_token_maps_claims():
    original = settings.firebase_project_id
    settings.firebase_project_id = "vibefit-a897e"
    fake_claims = {"user_id": "uid-1", "email": "person@gmail.com", "name": "Person"}
    try:
        with patch("core.firebase_auth.google_id_token.verify_firebase_token", return_value=fake_claims):
            claims = verify_firebase_token("fake-but-well-formed-token")
        assert claims == {"uid": "uid-1", "email": "person@gmail.com", "name": "Person"}
    finally:
        settings.firebase_project_id = original


@pytest.mark.asyncio
async def test_firebase_token_provisions_user_and_authorizes(client: AsyncClient):
    fake_claims = {"uid": "fb-uid-123", "email": "fbuser@gmail.com", "name": "FB User"}
    # Patch where deps imports it.
    with patch("api.deps.verify_firebase_token", return_value=fake_claims):
        resp = await client.get(
            "/api/v1/analysis/latest",
            headers={"Authorization": "Bearer fake-firebase-token"},
        )
    # User auto-created and authorized; 404 = no analysis yet (not 401).
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_invalid_token_rejected(client: AsyncClient):
    with patch("api.deps.verify_firebase_token", return_value=None):
        resp = await client.get(
            "/api/v1/analysis/latest",
            headers={"Authorization": "Bearer garbage"},
        )
    assert resp.status_code == 401
