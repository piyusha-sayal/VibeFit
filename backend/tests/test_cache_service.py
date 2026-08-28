"""In-process TTL + LRU cache.

Replaced a Redis-backed implementation: the only consumer is image-hash reuse
in the ML pipeline, so a per-instance cache is equivalent and removes an
external service from the deployment. Bounds matter — analysis results embed
468 landmarks each and this runs in a 512 MB container.
"""
import time

import pytest

from services.cache_service import CacheService


@pytest.mark.asyncio
async def test_round_trip():
    cache = CacheService()
    await cache.set("analysis:u:1", {"shape": "oval"})
    assert await cache.get("analysis:u:1") == {"shape": "oval"}


@pytest.mark.asyncio
async def test_missing_key_returns_none():
    assert await CacheService().get("nope") is None


@pytest.mark.asyncio
async def test_expired_entry_returns_none(monkeypatch):
    cache = CacheService()
    await cache.set("k", "v", ttl=10)

    real = time.monotonic
    monkeypatch.setattr(time, "monotonic", lambda: real() + 11)
    assert await cache.get("k") is None


@pytest.mark.asyncio
async def test_entry_alive_within_ttl(monkeypatch):
    cache = CacheService()
    await cache.set("k", "v", ttl=10)

    real = time.monotonic
    monkeypatch.setattr(time, "monotonic", lambda: real() + 5)
    assert await cache.get("k") == "v"


@pytest.mark.asyncio
async def test_delete_and_invalidate_prefix():
    cache = CacheService()
    await cache.set("analysis:u1:a", 1)
    await cache.set("analysis:u1:b", 2)
    await cache.set("analysis:u2:c", 3)

    await cache.delete("analysis:u1:a")
    assert await cache.get("analysis:u1:a") is None

    await cache.invalidate_prefix("analysis:u1:")
    assert await cache.get("analysis:u1:b") is None
    # Another user's entries are untouched.
    assert await cache.get("analysis:u2:c") == 3


@pytest.mark.asyncio
async def test_evicts_least_recently_used_past_the_cap():
    """Unbounded growth would be a memory leak in a 512 MB container."""
    cache = CacheService(max_entries=3)
    for k in ("a", "b", "c"):
        await cache.set(k, k)

    await cache.get("a")       # 'a' becomes most-recently-used, so 'b' is next out
    await cache.set("d", "d")

    assert await cache.get("b") is None
    assert await cache.get("a") == "a"
    assert await cache.get("c") == "c"
    assert await cache.get("d") == "d"


@pytest.mark.asyncio
async def test_overwriting_a_key_does_not_grow_the_cache():
    cache = CacheService(max_entries=2)
    await cache.set("k", 1)
    await cache.set("k", 2)
    await cache.set("other", 3)

    assert await cache.get("k") == 2
    assert await cache.get("other") == 3
