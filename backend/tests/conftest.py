import os

# Provide required settings before any app module imports core.config.
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
os.environ.setdefault("SECRET_KEY", "test-secret-key-not-for-production")

import asyncio
import io

import numpy as np
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from PIL import Image
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from core.database import Base, get_db, get_session_factory
from api.deps import get_cache
from main import app

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"


class _SharedSession:
    """Async-context wrapper that hands out the test's session without closing it.

    Background tasks open their own session via the get_session_factory
    dependency. In tests that must resolve to the same in-memory SQLite session
    the request used — a fresh connection would get a *different* empty
    in-memory database.
    """

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def __call__(self) -> "_SharedSession":
        return self

    async def __aenter__(self) -> AsyncSession:
        return self._session

    async def __aexit__(self, *exc_info) -> bool:
        return False


class _FakeCache:
    """In-memory stand-in for CacheService so tests need no Redis."""

    def __init__(self) -> None:
        self._store: dict = {}

    async def get(self, key):
        return self._store.get(key)

    async def set(self, key, value, ttl=None):
        self._store[key] = value

    async def delete(self, key):
        self._store.pop(key, None)

    async def invalidate_prefix(self, prefix):
        for k in [k for k in self._store if str(k).startswith(prefix)]:
            self._store.pop(k, None)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def db_session():
    engine = create_async_engine(TEST_DB_URL)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    Session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with Session() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession):
    app.dependency_overrides[get_db] = lambda: db_session
    app.dependency_overrides[get_cache] = lambda: _FakeCache()
    app.dependency_overrides[get_session_factory] = lambda: _SharedSession(db_session)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def _jpeg():
    """Factory for a synthetic solid-color JPEG (no detectable face — analyzers
    return graceful no-detection defaults, which is fine for HTTP-contract tests)."""
    def _make(shade: int = 140) -> bytes:
        arr = np.full((300, 300, 3), shade, dtype=np.uint8)
        buf = io.BytesIO()
        Image.fromarray(arr).save(buf, format="JPEG")
        return buf.getvalue()
    return _make
