"""Async analysis contract: upload returns a pending row, the background job
finishes it, failures are recorded, and stranded rows time out."""
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from models.analysis import Analysis
from services.analysis_service import AnalysisService, _is_stale_processing


async def _auth(client: AsyncClient, email: str) -> dict:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Async", "email": email, "password": "password123"})
    assert reg.status_code in (200, 201), reg.text
    return {"Authorization": f"Bearer {reg.json()['access_token']}"}


@pytest.mark.asyncio
async def test_upload_returns_pending_row_immediately(client: AsyncClient, _jpeg):
    auth = await _auth(client, "async-pending@test.com")
    res = await client.post("/api/v1/analysis/upload", headers=auth,
                            files={"file": ("face.jpg", _jpeg(), "image/jpeg")})
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["status"] == "processing"
    # No analysis blocks yet — the client must poll for them.
    assert body["face_analysis"] is None
    assert body["recommendations"] == []


@pytest.mark.asyncio
async def test_background_job_completes_the_row(client: AsyncClient, _jpeg):
    auth = await _auth(client, "async-complete@test.com")
    up = await client.post("/api/v1/analysis/upload", headers=auth,
                           files={"file": ("face.jpg", _jpeg(), "image/jpeg")})
    got = await client.get(f"/api/v1/analysis/{up.json()['id']}", headers=auth)
    assert got.status_code == 200
    assert got.json()["status"] == "complete"


@pytest.mark.asyncio
async def test_run_pending_marks_failed_with_message(db_session, monkeypatch):
    """An exception inside the ML pipeline must be recorded on the row, not lost
    — the background task swallows exceptions so this is the only user signal."""
    user_id = "user-fail"
    svc = AnalysisService(db_session, _NullCache(), None)

    async def _boom(_self, _image_bytes):
        raise RuntimeError("mediapipe exploded")

    monkeypatch.setattr(AnalysisService, "_run_ml", _boom)

    analysis = await svc.create_pending(user_id, "local://x")
    result = await svc.run_pending(analysis.id, user_id, b"not-an-image")

    assert result is not None
    assert result.status == "failed"
    assert "mediapipe exploded" in result.error_message


@pytest.mark.asyncio
async def test_run_pending_ignores_unknown_row(db_session):
    svc = AnalysisService(db_session, _NullCache(), None)
    assert await svc.run_pending("no-such-id", "nobody", b"") is None


@pytest.mark.asyncio
async def test_stale_processing_row_reported_as_failed(client: AsyncClient, db_session, _jpeg):
    """A crash mid-job would strand a row in "processing" forever; reads past the
    staleness window report it failed so the app can offer a retry."""
    auth = await _auth(client, "async-stale@test.com")
    up = await client.post("/api/v1/analysis/upload", headers=auth,
                           files={"file": ("face.jpg", _jpeg(), "image/jpeg")})
    aid = up.json()["id"]

    row = (await db_session.execute(select(Analysis).where(Analysis.id == aid))).scalar_one()
    row.status = "processing"
    row.created_at = datetime.now(timezone.utc) - timedelta(hours=1)
    await db_session.flush()

    got = await client.get(f"/api/v1/analysis/{aid}", headers=auth)
    assert got.status_code == 200
    assert got.json()["status"] == "failed"


def test_is_stale_processing_boundaries():
    now = datetime.now(timezone.utc)

    fresh = Analysis(id="a", user_id="u", status="processing", created_at=now)
    assert _is_stale_processing(fresh) is False

    old = Analysis(id="b", user_id="u", status="processing",
                   created_at=now - timedelta(hours=1))
    assert _is_stale_processing(old) is True

    # A naive timestamp (what SQLite returns) must not raise.
    naive = Analysis(id="c", user_id="u", status="processing",
                     created_at=(now - timedelta(hours=1)).replace(tzinfo=None))
    assert _is_stale_processing(naive) is True

    # Already-finished rows are never rewritten, however old.
    done = Analysis(id="d", user_id="u", status="complete",
                    created_at=now - timedelta(days=7))
    assert _is_stale_processing(done) is False


class _NullCache:
    async def get(self, key):
        return None

    async def set(self, key, value, ttl=None):
        return None

    async def delete(self, key):
        return None

    async def invalidate_prefix(self, prefix):
        return None
