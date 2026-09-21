"""Personal-colour endpoints: the static season reference and the user's report."""
import pytest
from httpx import AsyncClient
from sqlalchemy import select

from models.analysis import Analysis


async def _register(client: AsyncClient, email: str) -> dict:
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Colour Test", "email": email, "password": "password123"})
    assert reg.status_code == 201, reg.text
    return {"Authorization": f"Bearer {reg.json()['access_token']}"}


async def _seed_analysis(db, user_email: str, colors: dict | None) -> str:
    """Insert a completed analysis directly; the upload path is covered elsewhere."""
    from models.user import User

    user = (await db.execute(select(User).where(User.email == user_email))).scalars().first()
    analysis = Analysis(
        user_id=user.id,
        image_url="local://test",
        status="complete",
        color_analysis=colors,
        quality={"acceptable": True},
    )
    db.add(analysis)
    await db.commit()
    return analysis.id


@pytest.mark.asyncio
async def test_season_reference_is_public_and_complete(client: AsyncClient):
    res = await client.get("/api/v1/color/seasons")
    assert res.status_code == 200
    seasons = res.json()["seasons"]
    assert len(seasons) == 12
    assert {s["family"] for s in seasons} == {"spring", "summer", "autumn", "winter"}


@pytest.mark.asyncio
async def test_single_season_returns_every_palette(client: AsyncClient):
    res = await client.get("/api/v1/color/seasons/deep_winter")
    assert res.status_code == 200
    body = res.json()
    assert body["label"] == "Deep Winter"
    assert body["lipstick"] and body["garments"]["indian"]


@pytest.mark.asyncio
async def test_unknown_season_is_404(client: AsyncClient):
    assert (await client.get("/api/v1/color/seasons/autumn_of_my_discontent")).status_code == 404


@pytest.mark.asyncio
async def test_report_requires_auth(client: AsyncClient):
    assert (await client.get("/api/v1/color/report")).status_code in (401, 403)


@pytest.mark.asyncio
async def test_report_404s_before_any_scan(client: AsyncClient):
    auth = await _register(client, "colour-none@test.com")
    assert (await client.get("/api/v1/color/report", headers=auth)).status_code == 404


@pytest.mark.asyncio
async def test_report_reads_the_latest_analysis(client: AsyncClient, db_session):
    auth = await _register(client, "colour-report@test.com")
    await _seed_analysis(db_session, "colour-report@test.com", {
        "skinUndertone": "cool", "contrastLevel": "high",
        "depth": "deep", "chroma": "bright", "skinColor": "#5f4033",
    })
    res = await client.get("/api/v1/color/report", headers=auth)
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["season"] == "deep_winter"
    assert body["palettes"]["lipstick"]
    assert body["confidence"] > 0
    assert body["limitations"]


@pytest.mark.asyncio
async def test_report_404s_when_the_scan_found_no_colour(client: AsyncClient, db_session):
    auth = await _register(client, "colour-empty@test.com")
    await _seed_analysis(db_session, "colour-empty@test.com", None)
    res = await client.get("/api/v1/color/report", headers=auth)
    assert res.status_code == 404
