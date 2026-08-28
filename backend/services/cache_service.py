import time
from collections import OrderedDict
from typing import Any, Optional

# Entry cap, not a byte cap: analysis results embed 468 face landmarks and run
# into tens of KB each. 128 entries keeps the cache comfortably inside the
# 512 MB free-tier budget while still absorbing repeat scans of the same photo.
MAX_ENTRIES = 128
DEFAULT_TTL_SECONDS = 300


class CacheService:
    """In-process TTL + LRU cache.

    Replaces the previous Redis-backed cache. The only consumer is the
    image-hash reuse in AnalysisService._run_ml, which just avoids recomputing
    ML for a byte-identical image — a per-instance cache serves that identically
    while removing an entire external service from the deployment. If the app
    ever scales beyond one instance, the worst case is a cache miss and a
    recompute, never a correctness problem.

    Not a persistence layer: entries are lost on restart, by design.
    """

    def __init__(self, max_entries: int = MAX_ENTRIES) -> None:
        # key -> (expires_at_epoch, value); ordered for LRU eviction.
        self._store: OrderedDict[str, tuple[float, Any]] = OrderedDict()
        self._max_entries = max_entries

    async def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if expires_at < time.monotonic():
            self._store.pop(key, None)
            return None
        self._store.move_to_end(key)  # mark recently used
        return value

    async def set(self, key: str, value: Any, ttl: int = DEFAULT_TTL_SECONDS) -> None:
        self._store[key] = (time.monotonic() + ttl, value)
        self._store.move_to_end(key)
        while len(self._store) > self._max_entries:
            self._store.popitem(last=False)  # evict least-recently-used

    async def delete(self, key: str) -> None:
        self._store.pop(key, None)

    async def invalidate_prefix(self, prefix: str) -> None:
        for key in [k for k in self._store if k.startswith(prefix)]:
            self._store.pop(key, None)
