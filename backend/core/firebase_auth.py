"""Optional Firebase ID-token verification.

Verifies tokens with google-auth's lightweight `verify_firebase_token`
(signature + issuer + audience against Google's public JWKS over HTTPS) —
no service-account file, no firebase-admin SDK. That SDK pulls in
google-cloud-firestore/storage + grpc, whose current releases require
protobuf>=6, which conflicts with mediapipe's protobuf<5 pin; this path
avoids that entirely. Only FIREBASE_PROJECT_ID is needed (same project id
the mobile app already uses), and it's free — no paid Firebase plan.
"""
from __future__ import annotations

import logging
from typing import Optional

from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from core.config import settings

logger = logging.getLogger(__name__)

_request = google_requests.Request()


def verify_firebase_token(token: str) -> Optional[dict]:
    """Return decoded claims ({uid, email, name}) or None if invalid/unavailable."""
    if not settings.firebase_project_id:
        return None
    try:
        claims = google_id_token.verify_firebase_token(
            token, _request, audience=settings.firebase_project_id
        )
        if not claims:
            return None
        return {
            "uid": claims.get("user_id") or claims.get("sub"),
            "email": claims.get("email", ""),
            "name": claims.get("name") or (claims.get("email", "").split("@")[0]),
        }
    except Exception as exc:
        logger.info("Firebase token verification failed: %s", exc)
        return None
