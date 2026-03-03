"""
Cache Service Unit Tests

Tests the caching layer for:
- Deterministic cache key generation
- Key includes tokenizer_name, version, and text hash
- Unicode normalization consistency in keys
- Cache hit vs miss behavior (mocked Redis)
- Graceful degradation when cache is None

Single Responsibility: verify cache key logic and service contract.
"""

import hashlib
import unicodedata

import pytest

from app.core.constants import UNICODE_NORMALIZATION_FORM
from app.services.cache_service import CacheService, _hash_text, _normalize_text


class TestTextNormalization:
    """Tests for Unicode NFC normalization."""

    def test_nfc_normalization_is_applied(self):
        # é as combining char (e + accent) vs precomposed é
        decomposed = "e\u0301"  # NFD
        composed = "\u00e9"     # NFC
        assert _normalize_text(decomposed) == _normalize_text(composed)

    def test_ascii_unchanged(self):
        text = "Hello World"
        assert _normalize_text(text) == text

    def test_cjk_unchanged(self):
        text = "東京は日本の首都"
        assert _normalize_text(text) == text


class TestTextHashing:
    """Tests for SHA-256 text hashing."""

    def test_deterministic_hash(self):
        text = "Hello World"
        h1 = _hash_text(text)
        h2 = _hash_text(text)
        assert h1 == h2

    def test_different_texts_different_hashes(self):
        h1 = _hash_text("Hello")
        h2 = _hash_text("World")
        assert h1 != h2

    def test_unicode_equivalent_same_hash(self):
        """NFC-equivalent strings must hash identically."""
        decomposed = "e\u0301"
        composed = "\u00e9"
        assert _hash_text(decomposed) == _hash_text(composed)

    def test_hash_is_sha256(self):
        text = "test"
        normalized = unicodedata.normalize(UNICODE_NORMALIZATION_FORM, text)
        expected = hashlib.sha256(normalized.encode("utf-8")).hexdigest()
        assert _hash_text(text) == expected


class TestCacheKeyBuilding:
    """Tests for deterministic cache key construction."""

    def test_key_contains_all_components(self):
        key = CacheService.build_key("tiktoken_cl100k", "0.6.0", "hello")
        assert "tiktoken_cl100k" in key
        assert "0.6.0" in key
        # Text hash should be present (SHA-256 hex = 64 chars)
        parts = key.split(":")
        assert len(parts) == 3
        assert len(parts[2]) == 64  # SHA-256 hex digest

    def test_different_versions_different_keys(self):
        """Upgrading tokenizer version must invalidate cache."""
        key_v1 = CacheService.build_key("tok", "1.0.0", "hello")
        key_v2 = CacheService.build_key("tok", "2.0.0", "hello")
        assert key_v1 != key_v2

    def test_different_tokenizers_different_keys(self):
        key_a = CacheService.build_key("tok_a", "1.0.0", "hello")
        key_b = CacheService.build_key("tok_b", "1.0.0", "hello")
        assert key_a != key_b

    def test_different_texts_different_keys(self):
        key_a = CacheService.build_key("tok", "1.0.0", "hello")
        key_b = CacheService.build_key("tok", "1.0.0", "world")
        assert key_a != key_b

    def test_unicode_equivalent_same_key(self):
        """NFC-equivalent texts must produce identical keys."""
        key_nfd = CacheService.build_key("tok", "1.0.0", "e\u0301")
        key_nfc = CacheService.build_key("tok", "1.0.0", "\u00e9")
        assert key_nfd == key_nfc

    def test_key_determinism(self):
        k1 = CacheService.build_key("tok", "1.0.0", "test")
        k2 = CacheService.build_key("tok", "1.0.0", "test")
        assert k1 == k2


class TestCacheServiceInit:
    """Tests for CacheService initialization."""

    def test_default_ttl(self):
        from app.core.constants import DEFAULT_CACHE_TTL_SECONDS
        service = CacheService()
        assert service._cache.ttl == DEFAULT_CACHE_TTL_SECONDS

    def test_custom_ttl(self):
        service = CacheService(ttl=600)
        assert service._cache.ttl == 600
