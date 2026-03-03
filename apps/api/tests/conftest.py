"""
Test Configuration and Shared Fixtures

Single Responsibility: provide reusable test fixtures and configuration.
All test modules import from here — no fixture duplication.

Environment setup:
- Env vars are injected BEFORE any app module is imported.
  This prevents pydantic-settings from failing on missing secrets.
"""

import os

# ── Inject test env vars before any app import ───────────
# This MUST happen at module level, before pytest collects test files
# that import from app.*.
os.environ.setdefault("APP_ENV", "testing")
os.environ.setdefault("SECRET_KEY", "test-only-secret-key-not-for-production")
os.environ.setdefault(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@localhost:5432/tokentax_test",
)
os.environ.setdefault("REDIS_URL", "redis://localhost:6379/1")
os.environ.setdefault("REDIS_TTL_SECONDS", "60")
os.environ.setdefault("CORS_ORIGINS_STR", "http://localhost:3000")

import pytest


# ── Golden Test Fixtures ──────────────────────────────────
# These are deterministic reference texts for regression testing.
# If a tokenizer produces different counts for these inputs,
# it indicates either a version change or a bug.

GOLDEN_ENGLISH_TEXT = "The quick brown fox jumps over the lazy dog."
GOLDEN_JAPANESE_TEXT = "東京は日本の首都であり、世界最大の都市圏です。"
GOLDEN_HINDI_TEXT = "भारत एक विशाल और विविधतापूर्ण देश है।"
GOLDEN_ARABIC_TEXT = "اللغة العربية هي واحدة من أقدم اللغات في العالم."
GOLDEN_CHINESE_TEXT = "人工智能正在改变世界各地人们的生活方式。"
GOLDEN_KOREAN_TEXT = "한국어는 아름다운 언어이며 독특한 문자 체계를 가지고 있습니다."

# Short text for edge case testing
GOLDEN_SINGLE_CHAR = "a"
GOLDEN_EMPTY_AFTER_STRIP = ""
GOLDEN_UNICODE_MIXED = "Hello 世界 مرحبا мир 🌍"

# Known tiktoken cl100k_base token counts for golden texts.
# Pinned to the installed tiktoken version. If the library upgrades,
# re-run `python -c "import tiktoken; ..."` and update these values.
# Last verified: tiktoken 0.12.0 on 2026-03-03.
TIKTOKEN_GOLDEN_COUNTS = {
    GOLDEN_ENGLISH_TEXT: 10,
    GOLDEN_SINGLE_CHAR: 1,
    GOLDEN_UNICODE_MIXED: 15,
}


@pytest.fixture
def english_text() -> str:
    return GOLDEN_ENGLISH_TEXT


@pytest.fixture
def japanese_text() -> str:
    return GOLDEN_JAPANESE_TEXT


@pytest.fixture
def hindi_text() -> str:
    return GOLDEN_HINDI_TEXT


@pytest.fixture
def arabic_text() -> str:
    return GOLDEN_ARABIC_TEXT


@pytest.fixture
def chinese_text() -> str:
    return GOLDEN_CHINESE_TEXT


@pytest.fixture
def multilingual_texts() -> dict[str, str]:
    """Language code → text mapping for batch testing."""
    return {
        "en": GOLDEN_ENGLISH_TEXT,
        "ja": GOLDEN_JAPANESE_TEXT,
        "hi": GOLDEN_HINDI_TEXT,
        "ar": GOLDEN_ARABIC_TEXT,
        "zh": GOLDEN_CHINESE_TEXT,
        "ko": GOLDEN_KOREAN_TEXT,
    }
