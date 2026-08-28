"""UAT: end-to-end acceptance through the real API for the new features.

Registers a user, uploads images and exercises every new endpoint
(upload, upload-multi, report, card, overlay, progress) against the running
FastAPI app + real analyzers. Synthetic images have no detectable face, so the
pipeline returns graceful defaults — the point here is the HTTP contract works
end-to-end (status codes, content types, persisted blocks).
"""
import io

import numpy as np
import pytest
from httpx import AsyncClient
from PIL import Image


def _jpeg(shade: int = 140) -> bytes:
    arr = np.full((300, 300, 3), shade, dtype=np.uint8)
    buf = io.BytesIO()
    Image.fromarray(arr).save(buf, format="JPEG")
    return buf.getvalue()


async def _token(client: AsyncClient, email: str) -> str:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "UAT", "email": email, "password": "password123"})
    assert reg.status_code in (200, 201), reg.text
    return reg.json()["access_token"]


@pytest.mark.asyncio
async def test_uat_full_flow(client: AsyncClient):
    token = await _token(client, "uat@test.com")
    auth = {"Authorization": f"Bearer {token}"}

    # 1) Upload + analyze -> persisted blocks present.
    up = await client.post("/api/v1/analysis/upload", headers=auth,
                           files={"file": ("face.jpg", _jpeg(), "image/jpeg")})
    assert up.status_code == 201, up.text
    body = up.json()
    aid = body["id"]
    assert body["status"] == "complete"
    assert body["quality"] is not None
    assert body["face_analysis"] is not None
    assert isinstance(body["recommendations"], list) and body["recommendations"]

    # 2) Fetch by id.
    got = await client.get(f"/api/v1/analysis/{aid}", headers=auth)
    assert got.status_code == 200

    # 3) PDF report.
    rep = await client.get(f"/api/v1/analysis/{aid}/report", headers=auth)
    assert rep.status_code == 200
    assert rep.headers["content-type"] == "application/pdf"
    assert rep.content[:4] == b"%PDF"

    # 4) Summary card PNG (F6).
    card = await client.get(f"/api/v1/analysis/{aid}/card", headers=auth)
    assert card.status_code == 200
    assert card.headers["content-type"] == "image/png"
    assert card.content[:8] == b"\x89PNG\r\n\x1a\n"

    # 5) Stateless overlay PNG (F3).
    ov = await client.post("/api/v1/analysis/overlay", headers=auth,
                           files={"file": ("face.jpg", _jpeg(), "image/jpeg")})
    assert ov.status_code == 200
    assert ov.headers["content-type"] == "image/png"
    assert ov.content[:8] == b"\x89PNG\r\n\x1a\n"

    # 6) Progress trends (F13).
    prog = await client.get("/api/v1/analysis/progress", headers=auth)
    assert prog.status_code == 200
    pj = prog.json()
    assert pj["count"] >= 1
    assert "deltas" in pj and "series" in pj


@pytest.mark.asyncio
async def test_uat_multi_upload(client: AsyncClient):
    token = await _token(client, "uatmulti@test.com")
    auth = {"Authorization": f"Bearer {token}"}

    files = [
        ("files", ("a.jpg", _jpeg(130), "image/jpeg")),
        ("files", ("b.jpg", _jpeg(150), "image/jpeg")),
    ]
    res = await client.post("/api/v1/analysis/upload-multi", headers=auth, files=files)
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["status"] == "complete"
    assert body["face_analysis"] is not None
    assert body["quality"] is not None


@pytest.mark.asyncio
async def test_uat_overlay_rejects_bad_type(client: AsyncClient):
    token = await _token(client, "uatbad@test.com")
    auth = {"Authorization": f"Bearer {token}"}
    res = await client.post("/api/v1/analysis/overlay", headers=auth,
                            files={"file": ("x.txt", b"hello", "text/plain")})
    assert res.status_code == 422
