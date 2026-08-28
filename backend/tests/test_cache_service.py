"""CacheService must degrade to a cache-miss when Redis is unreachable.

The cache sits on the hot path of the analysis pipeline, so a Redis outage
turning every scan into a 500 would take the whole product down for an
optional dependency.
"""
import pytest

from services.cache_service import CacheService


class _DeadRedis:
    """Every operation fails, as an unreachable Redis would."""

    async def get(self, *a, **kw):
        raise ConnectionError("redis is down")

    async def setex(self, *a, **kw):
        raise ConnectionError("redis is down")

    async def delete(self, *a, **kw):
        raise ConnectionError("redis is down")

    async def keys(self, *a, **kw):
        raise ConnectionError("redis is down")


class _CorruptRedis:
    async def get(self, *a, **kw):
        return "{not valid json"


@pytest.mark.asyncio
async def test_get_returns_none_when_redis_down():
    assert await CacheService(_DeadRedis()).get("k") is None


@pytest.mark.asyncio
async def test_writes_do_not_raise_when_redis_down():
    cache = CacheService(_DeadRedis())
    await cache.set("k", {"a": 1})
    await cache.delete("k")
    await cache.invalidate_prefix("analysis:")


@pytest.mark.asyncio
async def test_corrupt_entry_is_treated_as_miss():
    assert await CacheService(_CorruptRedis()).get("k") is None


@pytest.mark.asyncio
async def test_round_trip_when_redis_healthy():
    class _Fake:
        def __init__(self):
            self.store = {}

        async def get(self, key):
            return self.store.get(key)

        async def setex(self, key, ttl, value):
            self.store[key] = value

        async def delete(self, *keys):
            for k in keys:
                self.store.pop(k, None)

        async def keys(self, pattern):
            prefix = pattern.rstrip("*")
            return [k for k in self.store if k.startswith(prefix)]

    cache = CacheService(_Fake())
    await cache.set("analysis:u:1", {"shape": "oval"})
    assert await cache.get("analysis:u:1") == {"shape": "oval"}
    await cache.invalidate_prefix("analysis:u:")
    assert await cache.get("analysis:u:1") is None
