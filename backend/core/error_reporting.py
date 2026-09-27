"""Optional Sentry error reporting, off unless SENTRY_DSN is set.

Without a DSN nothing is imported and nothing leaves the server. With one,
every event is scrubbed first: no request bodies, headers other than
Content-Type, cookies or query strings, no local variables, and any field
whose name suggests a credential, a photograph, a face measurement, an export
or a profile body is replaced. The user is reduced to an opaque id.
"""
from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger("vibefit.errors")

REDACTED = "[redacted]"
SENSITIVE_FRAGMENTS = (
    "password", "token", "secret", "authorization", "cookie", "credential", "api_key",
    "email", "image", "photo", "landmark", "face", "measurement", "export",
    "profile", "passport", "body",
)
SAFE_HEADERS = ("content-type",)


def _is_sensitive(key: str) -> bool:
    lowered = key.lower()
    return any(fragment in lowered for fragment in SENSITIVE_FRAGMENTS)


def _redact(value: Any) -> Any:
    if isinstance(value, dict):
        return {k: REDACTED if _is_sensitive(str(k)) else _redact(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_redact(v) for v in value]
    return value


def _scrub_request(request: dict) -> dict:
    headers = {k: v for k, v in (request.get("headers") or {}).items()
               if k.lower() in SAFE_HEADERS}
    kept = {k: request[k] for k in ("url", "method") if k in request}
    return {**kept, "headers": headers} if headers else kept


def _scrub_exception_text(value: Any) -> Any:
    """Database errors embed the SQL and its bound parameters in the message."""
    if not isinstance(value, str):
        return value
    cut = min((i for i in (value.find("[SQL:"), value.find("[parameters:")) if i >= 0),
              default=-1)
    return value if cut < 0 else f"{value[:cut].rstrip()} {REDACTED}"


def _scrub_exceptions(exception: dict) -> dict:
    values = [{**v, "value": _scrub_exception_text(v.get("value"))}
              for v in exception.get("values") or []]
    return {**exception, "values": values}


def scrub_event(event: dict, hint: dict) -> dict:
    """Sentry before_send hook. Returns a scrubbed copy; never mutates the input."""
    scrubbed = {k: _redact(v) for k, v in event.items()
                if k not in ("request", "user", "exception")}
    if "exception" in event:
        scrubbed["exception"] = _scrub_exceptions(event["exception"])
    if "request" in event:
        scrubbed["request"] = _scrub_request(event["request"])
    if "user" in event and event["user"].get("id"):
        scrubbed["user"] = {"id": event["user"]["id"]}
    return scrubbed


def _load_sdk():
    try:
        import sentry_sdk
    except ImportError:
        return None
    return sentry_sdk


def init_error_reporting(dsn: str, environment: str) -> bool:
    """Start Sentry if a DSN is configured. Never raises."""
    if not dsn:
        return False
    sdk = _load_sdk()
    if sdk is None:
        logger.warning("SENTRY_DSN is set but sentry-sdk is not installed; reporting disabled")
        return False
    try:
        sdk.init(
            dsn=dsn,
            environment=environment,
            send_default_pii=False,
            include_local_variables=False,
            max_request_body_size="never",
            traces_sample_rate=0.0,
            before_send=scrub_event,
        )
    except Exception as exc:  # a bad DSN must not stop the API from starting
        logger.warning("Sentry init failed: %s", type(exc).__name__)
        return False
    return True
