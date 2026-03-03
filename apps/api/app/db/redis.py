"""
Async Redis Client

Provides a singleton async Redis connection with:
- Health check support
- Base cache abstraction layer
- TTL management
- Connection pooling

Design decisions:
- redis-py async client over aioredis (merged into redis-py 4.2+)
- hiredis parser for 2-3x faster response parsing
- Singleton pattern via module-level client (safe for async)
- Cache keys namespaced by prefix to avoid collisions
"""

from typing import Any, Optional
import json

import redis.asyncio as aioredis
import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)

# Module-level client — initialized once, reused across requests
_redis_client: Optional[aioredis.Redis] = None


async def get_redis_client() -> aioredis.Redis:
    """
    Returns the singleton Redis client, initializing it if needed.
    Uses connection pool internally (redis-py default).
    """
    global _redis_client
    if _redis_client is None:
        _redis_client = aioredis.from_url(
            settings.REDIS_URL,
            encoding="utf-8",
            decode_responses=True,
            max_connections=20,
        )
    return _redis_client


async def close_redis_client() -> None:
    """Close the Redis connection pool. Call on shutdown."""
    global _redis_client
    if _redis_client:
        await _redis_client.aclose()
        _redis_client = None


class CacheManager:
    """
    Base cache abstraction layer.

    All cache interactions should go through this class to ensure:
    - Consistent key namespacing
    - Serialization/deserialization
    - TTL enforcement
    - Error isolation (cache miss ≠ application error)
    """

    NAMESPACE = "tokentax"

    def __init__(self, prefix: str, ttl: int = settings.REDIS_TTL_SECONDS):
        self.prefix = prefix
        self.ttl = ttl

    def _build_key(self, key: str) -> str:
        """Build a namespaced cache key."""
        return f"{self.NAMESPACE}:{self.prefix}:{key}"

    async def get(self, key: str) -> Optional[Any]:
        """
        Get a value from cache.
        Returns None on cache miss OR on Redis error (fail-open pattern).
        """
        try:
            client = await get_redis_client()
            raw = await client.get(self._build_key(key))
            if raw is None:
                return None
            return json.loads(raw)
        except Exception as e:
            logger.warning("cache.get.error", key=key, error=str(e))
            return None  # Fail open — cache miss, not application error

    async def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """
        Set a value in cache with TTL.
        Returns False on Redis error (fail-open).
        """
        try:
            client = await get_redis_client()
            serialized = json.dumps(value, default=str)
            await client.setex(
                self._build_key(key),
                ttl or self.ttl,
                serialized,
            )
            return True
        except Exception as e:
            logger.warning("cache.set.error", key=key, error=str(e))
            return False

    async def delete(self, key: str) -> bool:
        """Delete a key from cache."""
        try:
            client = await get_redis_client()
            await client.delete(self._build_key(key))
            return True
        except Exception as e:
            logger.warning("cache.delete.error", key=key, error=str(e))
            return False

    async def exists(self, key: str) -> bool:
        """Check if a key exists in cache."""
        try:
            client = await get_redis_client()
            return bool(await client.exists(self._build_key(key)))
        except Exception as e:
            logger.warning("cache.exists.error", key=key, error=str(e))
            return False

    async def health_check(self) -> bool:
        """Ping Redis and return True if healthy."""
        try:
            client = await get_redis_client()
            return await client.ping()
        except Exception:
            return False
