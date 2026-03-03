"""
Tokenizer Adapter Unit Tests

Tests each adapter individually for:
- Deterministic output (same input → same output)
- Correct confidence labeling
- Version reporting
- Graceful failure (returns -1, never raises)
- Golden reference counts (regression detection)

Single Responsibility: verify adapter contracts in isolation.
"""


from app.schemas.tokenizer import ConfidenceLevel
from app.services.tokenizers.tiktoken_adapter import TikTokenAdapter
from app.services.tokenizers.claude_adapter import ClaudeEstimateAdapter
from tests.conftest import (
    GOLDEN_ENGLISH_TEXT,
    GOLDEN_JAPANESE_TEXT,
    GOLDEN_SINGLE_CHAR,
    GOLDEN_UNICODE_MIXED,
    TIKTOKEN_GOLDEN_COUNTS,
)


# ══════════════════════════════════════════════════════════
#  TikToken Adapter Tests
# ══════════════════════════════════════════════════════════

class TestTikTokenAdapter:
    """Tests for the tiktoken cl100k_base adapter."""

    def setup_method(self):
        self.adapter = TikTokenAdapter()

    def test_name_is_stable(self):
        assert self.adapter.name == "tiktoken_cl100k"

    def test_confidence_is_exact(self):
        assert self.adapter.confidence == ConfidenceLevel.EXACT

    def test_version_is_string(self):
        version = self.adapter.version
        assert isinstance(version, str)
        assert len(version) > 0

    def test_display_name_not_empty(self):
        assert len(self.adapter.display_name) > 0

    def test_description_not_empty(self):
        assert len(self.adapter.description) > 0

    def test_english_golden_count(self):
        """Regression test: English golden text must produce known count."""
        count = self.adapter.tokenize(GOLDEN_ENGLISH_TEXT)
        expected = TIKTOKEN_GOLDEN_COUNTS[GOLDEN_ENGLISH_TEXT]
        assert count == expected, (
            f"tiktoken count changed! Got {count}, expected {expected}. "
            f"Has tiktoken been upgraded? Re-verify golden counts."
        )

    def test_single_char_golden_count(self):
        count = self.adapter.tokenize(GOLDEN_SINGLE_CHAR)
        expected = TIKTOKEN_GOLDEN_COUNTS[GOLDEN_SINGLE_CHAR]
        assert count == expected

    def test_unicode_mixed_golden_count(self):
        count = self.adapter.tokenize(GOLDEN_UNICODE_MIXED)
        expected = TIKTOKEN_GOLDEN_COUNTS[GOLDEN_UNICODE_MIXED]
        assert count == expected

    def test_determinism(self):
        """Same input must always produce same output."""
        count1 = self.adapter.tokenize(GOLDEN_ENGLISH_TEXT)
        count2 = self.adapter.tokenize(GOLDEN_ENGLISH_TEXT)
        count3 = self.adapter.tokenize(GOLDEN_ENGLISH_TEXT)
        assert count1 == count2 == count3

    def test_japanese_produces_more_tokens(self):
        """CJK text should produce more tokens per char than English."""
        en_count = self.adapter.tokenize(GOLDEN_ENGLISH_TEXT)
        ja_count = self.adapter.tokenize(GOLDEN_JAPANESE_TEXT)
        en_ratio = en_count / len(GOLDEN_ENGLISH_TEXT)
        ja_ratio = ja_count / len(GOLDEN_JAPANESE_TEXT)
        assert ja_ratio > en_ratio, (
            "Expected Japanese to have higher token/char ratio than English"
        )

    def test_empty_string_returns_zero(self):
        count = self.adapter.tokenize("")
        assert count == 0

    def test_whitespace_only(self):
        count = self.adapter.tokenize("   ")
        assert count > 0  # whitespace is tokenizable


# ══════════════════════════════════════════════════════════
#  Claude Estimate Adapter Tests
# ══════════════════════════════════════════════════════════

class TestClaudeEstimateAdapter:
    """Tests for the Claude heuristic adapter."""

    def setup_method(self):
        self.adapter = ClaudeEstimateAdapter()

    def test_name_is_stable(self):
        assert self.adapter.name == "claude_estimate"

    def test_confidence_is_estimated(self):
        assert self.adapter.confidence == ConfidenceLevel.ESTIMATED

    def test_version_is_string(self):
        assert isinstance(self.adapter.version, str)
        assert len(self.adapter.version) > 0

    def test_english_estimation(self):
        """English: ~4 chars per token, so 44 chars → ~11 tokens."""
        count = self.adapter.tokenize(GOLDEN_ENGLISH_TEXT, language="en")
        assert count > 0
        # Rough bounds: 44 chars / 4 chars_per_token ≈ 11
        assert 5 <= count <= 20

    def test_japanese_estimation(self):
        """Japanese: ~1.4 chars per token → more tokens per char."""
        count = self.adapter.tokenize(GOLDEN_JAPANESE_TEXT, language="ja")
        assert count > 0

    def test_determinism(self):
        c1 = self.adapter.tokenize(GOLDEN_ENGLISH_TEXT, language="en")
        c2 = self.adapter.tokenize(GOLDEN_ENGLISH_TEXT, language="en")
        assert c1 == c2

    def test_unknown_language_uses_default(self):
        """Unknown language falls back to default ratio, should not crash."""
        count = self.adapter.tokenize(GOLDEN_ENGLISH_TEXT, language="xx")
        assert count > 0

    def test_cjk_produces_more_tokens_per_char(self):
        """CJK has lower chars_per_token → more tokens."""
        en_count = self.adapter.tokenize(GOLDEN_ENGLISH_TEXT, language="en")
        ja_count = self.adapter.tokenize(GOLDEN_JAPANESE_TEXT, language="ja")
        en_ratio = en_count / len(GOLDEN_ENGLISH_TEXT)
        ja_ratio = ja_count / len(GOLDEN_JAPANESE_TEXT)
        assert ja_ratio > en_ratio

    def test_single_char_returns_at_least_one(self):
        count = self.adapter.tokenize("a", language="en")
        assert count >= 1

    def test_empty_string_returns_at_least_one(self):
        """max(1, round(0 / 4.0)) = max(1, 0) = 1."""
        count = self.adapter.tokenize("", language="en")
        assert count >= 1


# ══════════════════════════════════════════════════════════
#  Cross-Adapter Tests
# ══════════════════════════════════════════════════════════

class TestCrossAdapterConsistency:
    """Verify that different adapters produce reasonable relative results."""

    def test_all_adapters_return_positive_for_english(self):
        """All adapters must return > 0 for non-empty English text."""
        adapters = [TikTokenAdapter(), ClaudeEstimateAdapter()]
        for adapter in adapters:
            if hasattr(adapter.tokenize, '__code__') and \
               'language' in adapter.tokenize.__code__.co_varnames:
                count = adapter.tokenize(GOLDEN_ENGLISH_TEXT, language="en")
            else:
                count = adapter.tokenize(GOLDEN_ENGLISH_TEXT)
            assert count > 0, f"{adapter.name} returned {count} for English"

    def test_adapters_have_unique_names(self):
        """No two adapters should share the same name."""
        from app.services.tokenizers import get_all_adapters
        adapters = get_all_adapters()
        names = [a.name for a in adapters]
        assert len(names) == len(set(names)), f"Duplicate adapter names: {names}"

    def test_registry_has_at_least_four_adapters(self):
        """Phase 3 requires ≥4 tokenizers."""
        from app.services.tokenizers import get_all_adapters
        adapters = get_all_adapters()
        assert len(adapters) >= 4, (
            f"Expected ≥4 adapters, got {len(adapters)}: "
            f"{[a.name for a in adapters]}"
        )
