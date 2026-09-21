"""Request diagnostics that carry no personal information.

What gets logged: method, the route *template* (never the filled path, so an
id in a URL cannot leak), status, duration, and on failure the exception class
and a short request id. What never gets logged: user ids, emails, tokens,
headers, query values, request or response bodies.

The request id is returned to the client as `X-Request-ID` so a user can report
"it failed, here is the id" and the line can be found without asking who they are.
"""
from __future__ import annotations

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse

logger = logging.getLogger("vibefit.request")

# Requests slower than this are logged even when they succeed — the transient
# we are chasing showed up as a slow call before it showed up as a failed one.
SLOW_REQUEST_MS = 3000


def _route_template(request: Request) -> str:
    """The registered path, e.g. /api/v1/guides/progress/{slug}."""
    route = request.scope.get("route")
    return getattr(route, "path", None) or "unmatched"


class RequestDiagnosticsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = uuid.uuid4().hex[:12]
        request.state.request_id = request_id
        started = time.perf_counter()

        try:
            response = await call_next(request)
        except Exception as exc:
            elapsed = (time.perf_counter() - started) * 1000
            # Class name and module only. The message may contain a query or a
            # connection string, so it is deliberately not logged here.
            logger.error(
                "request_failed id=%s method=%s route=%s ms=%.0f exc=%s.%s",
                request_id, request.method, _route_template(request), elapsed,
                type(exc).__module__, type(exc).__name__,
            )
            logger.exception("request_failed id=%s traceback", request_id)
            return JSONResponse(
                status_code=500,
                content={"detail": "Something went wrong on our side.",
                         "requestId": request_id},
                headers={"X-Request-ID": request_id},
            )

        elapsed = (time.perf_counter() - started) * 1000
        if response.status_code >= 500 or elapsed >= SLOW_REQUEST_MS:
            logger.warning(
                "request id=%s method=%s route=%s status=%s ms=%.0f",
                request_id, request.method, _route_template(request),
                response.status_code, elapsed,
            )
        else:
            logger.info(
                "request id=%s method=%s route=%s status=%s ms=%.0f",
                request_id, request.method, _route_template(request),
                response.status_code, elapsed,
            )

        response.headers["X-Request-ID"] = request_id
        return response


def configure_logging(level: str = "INFO") -> None:
    logging.basicConfig(
        level=level,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
