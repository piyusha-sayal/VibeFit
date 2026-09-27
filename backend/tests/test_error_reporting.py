"""Error reporting stays off without a DSN and never ships personal data.

Sentry is optional: no DSN means no import and no network. When it is on,
every event passes through a scrubber that removes request bodies, headers,
cookies, query strings and any field that could hold a token, a password,
a photograph or a face measurement.
"""
import sys

from core import error_reporting
from core.error_reporting import REDACTED, init_error_reporting, scrub_event


def test_no_dsn_means_disabled_and_no_import(monkeypatch):
    monkeypatch.delitem(sys.modules, "sentry_sdk", raising=False)
    assert init_error_reporting("", "production") is False
    assert "sentry_sdk" not in sys.modules


def test_missing_sdk_does_not_break_startup(monkeypatch):
    monkeypatch.setattr(error_reporting, "_load_sdk", lambda: None)
    assert init_error_reporting("https://key@example.ingest.sentry.io/1", "production") is False


def test_request_body_headers_cookies_and_query_are_dropped():
    event = {"request": {
        "url": "https://api.example.com/api/v1/analysis/upload",
        "method": "POST",
        "data": {"image": "base64..."},
        "cookies": {"session": "abc"},
        "query_string": "token=abc",
        "headers": {"Authorization": "Bearer abc", "Content-Type": "image/jpeg"},
    }}
    request = scrub_event(event, {})["request"]
    assert request == {"url": "https://api.example.com/api/v1/analysis/upload",
                       "method": "POST", "headers": {"Content-Type": "image/jpeg"}}


def test_sensitive_fields_are_redacted_at_any_depth():
    event = {
        "extra": {"password": "pw", "note": "kept",
                  "nested": {"id_token": "t", "face_landmarks": [1, 2],
                             "image_url": "https://x/y.jpg", "measurements": {"jaw": 1}}},
        "contexts": {"export": {"account": {"email": "a@b.com"}}},
        "breadcrumbs": {"values": [{"message": "ok", "data": {"photo": "..."}}]},
    }
    out = scrub_event(event, {})
    assert out["extra"]["password"] == REDACTED
    assert out["extra"]["note"] == "kept"
    nested = out["extra"]["nested"]
    assert nested["id_token"] == nested["face_landmarks"] == REDACTED
    assert nested["image_url"] == nested["measurements"] == REDACTED
    assert out["contexts"]["export"] == REDACTED
    assert out["breadcrumbs"]["values"][0]["data"]["photo"] == REDACTED
    assert out["breadcrumbs"]["values"][0]["message"] == "ok"


def test_user_is_reduced_to_an_opaque_id():
    out = scrub_event({"user": {"id": "u1", "email": "a@b.com", "ip_address": "1.2.3.4"}}, {})
    assert out["user"] == {"id": "u1"}


def test_scrub_does_not_mutate_the_original():
    event = {"extra": {"password": "pw"}}
    scrub_event(event, {})
    assert event["extra"]["password"] == "pw"


def test_database_error_text_loses_sql_and_parameters():
    value = ("(asyncpg.exceptions.ConnectionDoesNotExistError) connection was closed\n"
             "[SQL: SELECT * FROM users WHERE email = $1]\n[parameters: ('a@b.com',)]")
    event = {"exception": {"values": [{"type": "DBAPIError", "value": value}]}}
    out = scrub_event(event, {})["exception"]["values"][0]
    assert out["type"] == "DBAPIError"
    assert "a@b.com" not in out["value"] and "SELECT" not in out["value"]
    assert out["value"].startswith("(asyncpg.exceptions.ConnectionDoesNotExistError)")


def test_dsn_starts_sentry_with_privacy_options(monkeypatch):
    calls = []

    class FakeSdk:
        @staticmethod
        def init(**kwargs):
            calls.append(kwargs)

    monkeypatch.setattr(error_reporting, "_load_sdk", lambda: FakeSdk)
    assert init_error_reporting("https://key@example.ingest.sentry.io/1", "production") is True
    options = calls[0]
    assert options["send_default_pii"] is False
    assert options["include_local_variables"] is False
    assert options["max_request_body_size"] == "never"
    assert options["before_send"] is scrub_event
    assert options["environment"] == "production"


def test_a_bad_dsn_does_not_stop_startup(monkeypatch):
    class BrokenSdk:
        @staticmethod
        def init(**kwargs):
            raise ValueError("bad dsn")

    monkeypatch.setattr(error_reporting, "_load_sdk", lambda: BrokenSdk)
    assert init_error_reporting("not-a-dsn", "production") is False
