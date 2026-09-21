from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from .config import settings

# Neon closes idle connections server-side. pool_pre_ping catches a dead
# connection at checkout; pool_recycle retires one before Neon does, which is
# the cheaper of the two paths. Both are needed: pre_ping alone still lets a
# long-lived connection sit past the server's idle limit.
#
# SQLite (used by the tests) has no real pool, so the sizing arguments are
# only passed for a networked database.
_pool_options: dict = {"pool_pre_ping": True}
if not settings.database_url.startswith("sqlite"):
    _pool_options.update(pool_recycle=240, pool_size=5, max_overflow=10, pool_timeout=30)

engine = create_async_engine(
    settings.database_url,
    echo=settings.environment == "development",
    **_pool_options,
)
AsyncSessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def get_session_factory():
    """Session factory for work that outlives the request (background tasks).

    Exposed as a dependency rather than importing AsyncSessionLocal directly so
    tests can point background work at the same database as the request.
    """
    return AsyncSessionLocal
