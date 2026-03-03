"""
Async PostgreSQL Session Management

Uses SQLAlchemy 2.0 async engine with asyncpg driver.

Design decisions:
- Async engine for non-blocking DB operations
- Connection pool tuned for concurrent API workloads
- Session factory uses expire_on_commit=False to prevent lazy load
  issues after commit (common async SQLAlchemy footgun)
- get_db() is a FastAPI dependency — yields session, auto-closes
"""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.config import settings

# ── Engine ────────────────────────────────────────────────
# pool_pre_ping: validates connections before use (handles stale connections)
# pool_size: base connection pool
# max_overflow: additional connections under load
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    pool_recycle=3600,  # Recycle connections every hour
)

# ── Session Factory ───────────────────────────────────────
AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,  # Critical for async — prevents lazy load after commit
    autocommit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that provides a database session.

    Usage:
        @router.get("/")
        async def endpoint(db: AsyncSession = Depends(get_db)):
            ...

    Automatically commits on success, rolls back on exception.
    """
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()
