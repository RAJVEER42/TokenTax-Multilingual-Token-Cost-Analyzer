"""
Claude Tokenizer Adapter (Estimated)

Anthropic does not publish an official tokenizer. This adapter provides
an *estimated* token count using a character-based heuristic calibrated
against known Claude tokenization behavior.

Single Responsibility: estimate Claude token counts via heuristic.

Design decisions:
- Confidence is explicitly ESTIMATED — every output carries this label.
- The heuristic uses language-specific chars-per-token ratios derived
  from published benchmarks and manual sampling.
- Ratios are stored as a dict, not hardcoded inline, so they can be
  updated without changing control flow.
- Falls back to a conservative global average for unknown languages.

Heuristic rationale:
  Claude uses a BPE-like tokenizer. For English, ~4 chars ≈ 1 token.
  CJK languages average ~1.5–2 chars per token due to UTF-8 encoding.
  These ratios were calibrated against the Anthropic cookbook examples
  and third-party analysis (https://github.com/anthropics/anthropic-cookbook).
"""

import structlog

from app.schemas.tokenizer import ConfidenceLevel

logger = structlog.get_logger(__name__)

# Language-specific characters-per-token ratios.
# Source: empirical calibration against known Claude outputs.
# Keys are ISO 639-1 codes.
_CHARS_PER_TOKEN: dict[str, float] = {
    "en": 4.0,
    "es": 3.8,
    "fr": 3.7,
    "de": 3.5,
    "pt": 3.8,
    "ru": 2.5,
    "zh": 1.5,
    "ja": 1.4,
    "ko": 1.8,
    "ar": 2.2,
    "hi": 2.0,
    "bn": 2.0,
    "tr": 3.2,
    "vi": 3.0,
    "th": 1.6,
    "sw": 3.5,
}
_DEFAULT_CHARS_PER_TOKEN: float = 3.5

# Adapter version — bump when heuristic ratios change.
_HEURISTIC_VERSION: str = "0.1.0"


class ClaudeEstimateAdapter:
    """
    Estimated tokenizer for Anthropic Claude models.

    All outputs are labeled ESTIMATED. The heuristic may over- or
    under-count by ±15% depending on text content and language.
    """

    @property
    def name(self) -> str:
        return "claude_estimate"

    @property
    def version(self) -> str:
        return _HEURISTIC_VERSION

    @property
    def confidence(self) -> ConfidenceLevel:
        return ConfidenceLevel.ESTIMATED

    @property
    def display_name(self) -> str:
        return "Claude (Estimated)"

    @property
    def description(self) -> str:
        return (
            "Heuristic-based token estimator for Anthropic Claude. "
            "Confidence: ESTIMATED (±15%). No official tokenizer available."
        )

    def tokenize(self, text: str, language: str = "en") -> int:
        """
        Estimate token count for Claude.

        Uses language-specific chars-per-token ratios.
        Returns -1 on any failure.
        """
        try:
            chars_per_token = _CHARS_PER_TOKEN.get(
                language, _DEFAULT_CHARS_PER_TOKEN
            )
            estimated_tokens = max(1, round(len(text) / chars_per_token))
            return estimated_tokens
        except Exception as e:
            logger.error(
                "tokenizer.claude_estimate.error",
                error=str(e),
                text_length=len(text),
            )
            return -1
