import json
import logging
from typing import Any, Optional
from redis.asyncio import Redis

logger = logging.getLogger(__name__)


class CacheService:
    """Redis-backed cache that degrades to a no-op when Redis is unreachable.

    The cache sits on the hot path of the analysis pipeline (image-hash reuse in
    AnalysisService._run_ml), so a Redis outage must not fail the request — a
    cache miss just means recomputing. Every method therefore swallows backend
    errors and logs them: reads return None, writes are dropped. This also makes
    Redis genuinely optional to deploy.
    """

    def __init__(self, redis: Redis) -> None:
        self._r = redis

    async def get(self, key: str) -> Optional[Any]:
        try:
            raw = await self._r.get(key)
        except Exception as exc:
            logger.warning("cache get failed for %s: %s", key, exc)
            return None
        if raw is None:
            return None
        try:
            return json.loads(raw)
        except (ValueError, TypeError) as exc:
            # Corrupt/legacy entry — treat as a miss rather than crashing.
            logger.warning("cache decode failed for %s: %s", key, exc)
            return None

    async def set(self, key: str, value: Any, ttl: int = 300) -> None:
        try:
            await self._r.setex(key, ttl, json.dumps(value, default=str))
        except Exception as exc:
            logger.warning("cache set failed for %s: %s", key, exc)

    async def delete(self, key: str) -> None:
        try:
            await self._r.delete(key)
        except Exception as exc:
            logger.warning("cache delete failed for %s: %s", key, exc)

    async def invalidate_prefix(self, prefix: str) -> None:
        try:
            keys = await self._r.keys(f"{prefix}*")
            if keys:
                await self._r.delete(*keys)
        except Exception as exc:
            logger.warning("cache invalidate failed for %s: %s", prefix, exc)
