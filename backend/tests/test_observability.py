"""Request diagnostics must be useful without being identifying."""
import pytest
from httpx import AsyncClient
from sqlalchemy.exc import DBAPIError, IntegrityError

from core import observability


@pytest.mark.asyncio
async def test_every_response_carries_a_request_id(client: AsyncClient):
    res = await client.get("/health")
    assert res.status_code == 200
    assert len(res.headers["x-request-id"]) == 12


@pytest.mark.asyncio
async def test_a_sane_inbound_request_id_is_echoed_back(client: AsyncClient):
    res = await client.get("/health", headers={"X-Request-ID": "mobile-retry-42"})
    assert res.headers["x-request-id"] == "mobile-retry-42"


@pytest.mark.asyncio
async def test_an_unreasonable_inbound_request_id_is_replaced(client: AsyncClient):
    """Too long, or the wrong shape, and it is not trustworthy enough to log."""
    res = await client.get("/health", headers={"X-Request-ID": "x" * 200})
    assert res.headers["x-request-id"] != "x" * 200
    assert len(res.headers["x-request-id"]) == 12


def test_connection_invalidated_dbapi_error_is_flagged():
    exc = DBAPIError("SELECT 1", {}, Exception("server closed the connection"),
                      connection_invalidated=True)
    assert observability._is_connection_error(exc) is True


def test_ordinary_db_error_is_not_flagged_as_a_connection_error():
    exc = IntegrityError("INSERT", {}, Exception("unique violation"))
    assert observability._is_connection_error(exc) is False


def test_a_non_db_exception_is_not_flagged_as_a_connection_error():
    assert observability._is_connection_error(ValueError("nope")) is False


@pytest.mark.asyncio
async def test_the_log_line_names_the_route_template_not_the_filled_path(
        client: AsyncClient, monkeypatch):
    """A slug, an email or a token must never reach the log line.

    The logger is swapped rather than captured: by this point in a full suite
    run, imported libraries have already reconfigured global logging, and this
    property is too important to test through something that flaky.
    """
    reg = await client.post("/api/v1/auth/register",
                            json={"name": "Obs", "email": "obs@test.com",
                                  "password": "password123"})
    auth = {"Authorization": f"Bearer {reg.json()['access_token']}"}

    lines: list[str] = []

    class _Recorder:
        def _record(self, message, *args, **kwargs):
            lines.append(message % args if args else message)

        info = warning = error = exception = _record

    monkeypatch.setattr(observability, "logger", _Recorder())
    await client.get("/api/v1/guides/progress/colour-basics", headers=auth)

    assert lines, "the middleware must log every request"
    assert any("{slug}" in line for line in lines), lines
    joined = " ".join(lines)
    for secret in ("colour-basics", "obs@test.com", "Bearer"):
        assert secret not in joined, secret


@pytest.mark.asyncio
async def test_db_health_reports_separately_from_app_health(client: AsyncClient):
    res = await client.get("/health/db")
    assert res.status_code in (200, 503)
    assert res.json()["database"] in ("reachable", "unreachable")
    assert "ms" in res.json()
