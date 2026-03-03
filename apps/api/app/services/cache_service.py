"""
Cache Service

Redis-backed caching for tokenization results.
Single Responsibility: build deterministic cache keys and manage TTL.

Design decisions:
- Cache key includes tokenizer_name + tokenizer_version + text_hash.
  Why tokenizer_version? When a tokenizer library is upgraded, the same
  text may yield a different token count. Including the version in the
  key automatically invalidates stale entries on upgrade — no manual
  cache flush needed.
- Text is hashed via SHA-256 after NFC normalization for consistency.
- On cold start (empty Redis), every request is a cache miss. The
  service simply computes fresh results and populates the cache.
  Subsequent requests for the same (text, tokenizer, version) triple
  are cache hits. This is a read-through caching pattern.
- Redis unavailability → graceful degradation. The service returns
  None on get() and silently drops set() — no request fails.
- TTL is configurable per-instance and defaults to the global setting.
"""

import hashlib
import unicodedata
from typing import Any, Optional

import structlog

from app.core.constants import (
    CACHE_KEY_PREFIX,
    DEFAULT_CACHE_TTL_SECONDS,
    UNICODE_NORMALIZATION_FORM,
)
from app.db.redis import CacheManager

logger = structlog.get_logger(__name__)


def _normalize_text(text: str) -> str:
    """Apply Unicode NFC normalization for deterministic hashing."""
    return unicodedata.normalize(UNICODE_NORMALIZATION_FORM, text)


def _hash_text(text: str) -> str:
    """SHA-256 hash of NFC-normalized text. Deterministic and collision-resistant."""
    normalized = _normalize_text(text)
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


class CacheService:
    """
    Tokenization result cache backed by Redis.

    Cache key structure:
        tokentax:tokenization:{tokenizer_name}:{tokenizer_version}:{text_sha256}

    This ensures:
    1. Different tokenizers never share cache entries.
    2. A tokenizer version upgrade automatically invalidates old entries.
    3. Unicode-equivalent texts hash identically (NFC normalization).
    """

    def __init__(self, ttl: int = DEFAULT_CACHE_TTL_SECONDS) -> None:
        self._cache = CacheManager(prefix=CACHE_KEY_PREFIX, ttl=ttl)

    @staticmethod
    def build_key(
        tokenizer_name: str,
        tokenizer_version: str,
        text: str,
    ) -> str:
        """
        Build a deterministic cache key.

        Components:
        - tokenizer_name: which tokenizer
        - tokenizer_version: exact version (invalidates on upgrade)
        - text_hash: SHA-256 of NFC-normalized input
        """
        text_hash = _hash_text(text)
        return f"{tokenizer_name}:{tokenizer_version}:{text_hash}"

    async def get(
        self,
        tokenizer_name: str,
        tokenizer_version: str,
        text: str,
    ) -> Optional[dict[str, Any]]:
        """
        Retrieve cached tokenization result.
        Returns None on miss or Redis failure.
        """
        key = self.build_key(tokenizer_name, tokenizer_version, text)
        result = await self._cache.get(key)
        if result is not None:
            logger.debug("cache.hit", tokenizer=tokenizer_name, key=key[:40])
        else:
            logger.debug("cache.miss", tokenizer=tokenizer_name, key=key[:40])
        return result

    async def set(
        self,
        tokenizer_name: str,
        tokenizer_version: str,
        text: str,
        value: dict[str, Any],
    ) -> bool:
        """
        Store tokenization result in cache.
        Returns False on Redis failure (fail-open).
        """
        key = self.build_key(tokenizer_name, tokenizer_version, text)
        return await self._cache.set(key, value)

    async def health_check(self) -> bool:
        """Check Redis connectivity."""
        return await self._cache.health_check()
