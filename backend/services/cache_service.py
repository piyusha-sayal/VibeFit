import json
from typing import Any, Optional
from redis.asyncio import Redis


class CacheService:
    def __init__(self, redis: Redis) -> None:
        self._r = redis

    async def get(self, key: str) -> Optional[Any]:
        raw = await self._r.get(key)
        if raw is None:
            return None
        return json.loads(raw)

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        await self._r.setex(key, ttl, json.dumps(value, default=str))

    async def delete(self, key: str) -> None:
        await self._r.delete(key)

    async def invalidate_prefix(self, prefix: str) -> None:
        keys = await self._r.keys(f"{prefix}*")
        if keys:
            await self._r.delete(*keys)
