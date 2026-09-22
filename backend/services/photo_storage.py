"""The one place that knows where a photograph physically lives.

Uploading and deleting were written in different places for a while, which is
how a photograph could be stored forever and never removed: the delete path
simply did not exist. Both directions live here now, and both agree on how a
stored URL maps back to an object key.

Without S3 credentials the app still works — the image is analysed in memory
and a `local://` placeholder is recorded instead. Those placeholders name
nothing to delete, which is the honest answer rather than a silent success.
"""
import asyncio
import logging
import uuid

import boto3

from core.config import settings

logger = logging.getLogger("vibefit.photos")

KEY_PREFIX = "uploads/"
LOCAL_SCHEME = "local://"

_s3_client = None


def _client():
    """Build the boto3 client once and reuse it (clients are thread-safe).

    Works against AWS S3 or any S3-compatible store. For Cloudflare R2, set
    S3_ENDPOINT_URL to https://<account-id>.r2.cloudflarestorage.com and
    AWS_REGION=auto.
    """
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            "s3",
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region,
            endpoint_url=settings.s3_endpoint_url or None,
        )
    return _s3_client


def configured() -> bool:
    return bool(settings.aws_access_key_id)


def public_url(key: str) -> str:
    """R2's public URL (r2.dev subdomain or custom domain) is unrelated to its
    API endpoint, so it has to be configured explicitly; fall back to the
    conventional AWS S3 virtual-host form."""
    if settings.s3_public_base_url:
        return f"{settings.s3_public_base_url.rstrip('/')}/{key}"
    return f"https://{settings.aws_s3_bucket}.s3.{settings.aws_region}.amazonaws.com/{key}"


def is_stored(url: str | None) -> bool:
    """True when this URL names an object that actually exists somewhere."""
    return bool(url) and not url.startswith(LOCAL_SCHEME)


def key_for(url: str | None) -> str | None:
    """Recover the object key from a stored URL.

    Deliberately conservative: it returns a key only for a URL this module
    could have produced, and only for one under the uploads prefix. Anything
    else returns None rather than guessing at a key and issuing a delete
    against an object nobody here created.
    """
    if not is_stored(url):
        return None
    marker = f"/{KEY_PREFIX}"
    index = url.find(marker)
    if index == -1:
        return None
    key = url[index + 1:]
    # No traversal, no empty name — the remainder must look like our own keys.
    tail = key[len(KEY_PREFIX):]
    if not tail or "/" in tail or ".." in tail:
        return None
    return key


async def store(data: bytes, content_type: str) -> str:
    """Store the image and return its URL.

    Without credentials this is a no-op returning a placeholder: the image is
    still analyzed in memory, it just is not retained anywhere.
    """
    if not configured():
        return f"{LOCAL_SCHEME}{uuid.uuid4()}"
    key = f"{KEY_PREFIX}{uuid.uuid4()}"
    try:
        await asyncio.to_thread(
            _client().put_object,
            Bucket=settings.aws_s3_bucket, Key=key, Body=data, ContentType=content_type,
        )
    except Exception:
        # Storage is not on the critical path — the analysis only needs the
        # bytes in memory. Losing the stored copy must not fail the scan.
        logger.exception("image upload failed; continuing without a stored copy")
        return f"{LOCAL_SCHEME}{uuid.uuid4()}"
    return public_url(key)


async def delete(url: str | None) -> bool:
    """Remove one stored photograph. True only if an object was really deleted.

    A placeholder URL, an unrecognised URL or a store with no credentials all
    return False. The caller decides what to tell the user; this returns what
    happened.
    """
    key = key_for(url)
    if key is None or not configured():
        return False
    try:
        await asyncio.to_thread(
            _client().delete_object, Bucket=settings.aws_s3_bucket, Key=key)
    except Exception:
        # Logged without the URL: object keys are not secret, but they are
        # per-user and there is no reason to put them in production logs.
        logger.exception("photo delete failed")
        return False
    return True
