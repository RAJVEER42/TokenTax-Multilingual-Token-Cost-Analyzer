"""
Application Constants

Central registry for all magic numbers, version strings, and static metadata.
Single Responsibility: provide immutable configuration constants.

Design decisions:
- FORMULA_VERSION is embedded in every fairness output for reproducibility.
  If the formula changes, bump this version so downstream consumers know
  that scores are no longer directly comparable.
- SUPPORTED_LANGUAGES is the canonical list; all services reference this.
- TOKENIZER_REGISTRY holds static metadata for each adapter (name, version,
  confidence level). Actual adapter loading is lazy and lives in the adapter layer.
"""

from typing import Final

# ── Formula Versioning ────────────────────────────────────
FORMULA_VERSION: Final[str] = "1.0.0"

# ── Rounding Policy ──────────────────────────────────────
# All floating-point outputs are rounded to this many decimal places
# to guarantee deterministic JSON serialization across platforms.
FLOAT_PRECISION: Final[int] = 6

# ── Fairness Score Bounds ─────────────────────────────────
FAIRNESS_SCORE_MIN: Final[float] = 0.0
FAIRNESS_SCORE_MAX: Final[float] = 100.0

# ── English Baseline ─────────────────────────────────────
ENGLISH_BASELINE_RATIO: Final[float] = 100.0

# ── Supported Languages ──────────────────────────────────
# ISO 639-1 code → display name
SUPPORTED_LANGUAGES: Final[dict[str, str]] = {
    "en": "English",
    "es": "Spanish",
    "fr": "French",
    "de": "German",
    "zh": "Chinese (Simplified)",
    "ja": "Japanese",
    "ko": "Korean",
    "ar": "Arabic",
    "hi": "Hindi",
    "ru": "Russian",
    "pt": "Portuguese",
    "tr": "Turkish",
    "vi": "Vietnamese",
    "th": "Thai",
    "sw": "Swahili",
    "bn": "Bengali",
}

# ── Unicode Normalization ─────────────────────────────────
UNICODE_NORMALIZATION_FORM: Final[str] = "NFC"

# ── Cache Configuration ──────────────────────────────────
DEFAULT_CACHE_TTL_SECONDS: Final[int] = 3600
CACHE_KEY_PREFIX: Final[str] = "tokenization"
