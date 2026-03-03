"""
TokenizerService Unit Tests

Tests the orchestration layer for:
- Unicode NFC normalization before dispatch
- Single adapter analysis
- Batch analysis with partial failures
- Deterministic output ordering
- Error capture without request crash
- Cache bypass when cache is None

Single Responsibility: verify orchestrator behavior, not adapter internals.
"""

import pytest

from app.schemas.tokenizer import ConfidenceLevel, TokenAnalysis
from app.services.tokenizer_service import TokenizerService
from app.services.tokenizers.tiktoken_adapter import TikTokenAdapter
from app.services.tokenizers.claude_adapter import ClaudeEstimateAdapter
from tests.conftest import GOLDEN_ENGLISH_TEXT, GOLDEN_JAPANESE_TEXT


class TestNormalization:
    """Tests for text normalization."""

    def test_nfc_normalization(self):
        decomposed = "e\u0301"  # NFD
        composed = "\u00e9"     # NFC
        assert TokenizerService.normalize_text(decomposed) == composed

    def test_ascii_passes_through(self):
        text = "Hello World"
        assert TokenizerService.normalize_text(text) == text

    def test_empty_string(self):
        assert TokenizerService.normalize_text("") == ""


class TestSingleAnalysis:
    """Tests for single-adapter analyze method."""

    def setup_method(self):
        self.service = TokenizerService(cache_service=None)

    def test_tiktoken_english(self):
        adapter = TikTokenAdapter()
        result = self.service.analyze(GOLDEN_ENGLISH_TEXT, "en", adapter)
        assert isinstance(result, TokenAnalysis)
        assert result.token_count > 0
        assert result.char_count == len(GOLDEN_ENGLISH_TEXT)
        assert result.confidence == ConfidenceLevel.EXACT
        assert result.language == "en"
        assert result.error is None

    def test_claude_estimate(self):
        adapter = ClaudeEstimateAdapter()
        result = self.service.analyze(GOLDEN_ENGLISH_TEXT, "en", adapter)
        assert result.confidence == ConfidenceLevel.ESTIMATED
        assert result.token_count > 0

    def test_efficiency_ratio_is_positive(self):
        adapter = TikTokenAdapter()
        result = self.service.analyze(GOLDEN_ENGLISH_TEXT, "en", adapter)
        assert result.efficiency_ratio > 0

    def test_efficiency_ratio_for_empty_is_zero(self):
        adapter = TikTokenAdapter()
        result = self.service.analyze("", "en", adapter)
        assert result.efficiency_ratio == 0.0

    def test_version_recorded(self):
        adapter = TikTokenAdapter()
        result = self.service.analyze(GOLDEN_ENGLISH_TEXT, "en", adapter)
        assert result.tokenizer_version == adapter.version


class TestBatchAnalysis:
    """Tests for batch_analyze across multiple adapters."""

    def setup_method(self):
        self.service = TokenizerService(cache_service=None)

    @pytest.mark.asyncio
    async def test_batch_returns_results_for_available_adapters(self):
        # Use only tiktoken and claude (always available)
        results, errors, _ = await self.service.batch_analyze(
            text=GOLDEN_ENGLISH_TEXT,
            language="en",
            tokenizer_names=["tiktoken_cl100k", "claude_estimate"],
        )
        adapter_names = {r.tokenizer_name for r in results}
        assert "tiktoken_cl100k" in adapter_names
        assert "claude_estimate" in adapter_names

    @pytest.mark.asyncio
    async def test_batch_deterministic_ordering(self):
        results, _, _ = await self.service.batch_analyze(
            text=GOLDEN_ENGLISH_TEXT,
            language="en",
            tokenizer_names=["claude_estimate", "tiktoken_cl100k"],
        )
        names = [r.tokenizer_name for r in results]
        assert names == sorted(names), "Results must be sorted by name"

    @pytest.mark.asyncio
    async def test_batch_partial_failure_does_not_crash(self):
        """Unknown tokenizer name is skipped, not crashed."""
        results, errors, _ = await self.service.batch_analyze(
            text=GOLDEN_ENGLISH_TEXT,
            language="en",
            tokenizer_names=["tiktoken_cl100k", "nonexistent_tokenizer"],
        )
        # tiktoken should succeed
        assert any(r.tokenizer_name == "tiktoken_cl100k" for r in results)
        # nonexistent is simply not found — no error, no result
        assert len(results) >= 1

    @pytest.mark.asyncio
    async def test_batch_all_adapters(self):
        """Calling with None uses all registered adapters."""
        results, errors, _ = await self.service.batch_analyze(
            text=GOLDEN_ENGLISH_TEXT,
            language="en",
            tokenizer_names=None,
        )
        # At least tiktoken and claude should work
        working_names = {r.tokenizer_name for r in results}
        assert "tiktoken_cl100k" in working_names
        assert "claude_estimate" in working_names

    @pytest.mark.asyncio
    async def test_batch_determinism_across_runs(self):
        r1, _, _ = await self.service.batch_analyze(
            text=GOLDEN_ENGLISH_TEXT,
            language="en",
            tokenizer_names=["tiktoken_cl100k"],
        )
        r2, _, _ = await self.service.batch_analyze(
            text=GOLDEN_ENGLISH_TEXT,
            language="en",
            tokenizer_names=["tiktoken_cl100k"],
        )
        assert r1[0].token_count == r2[0].token_count

    @pytest.mark.asyncio
    async def test_batch_multilingual_difference(self):
        """English and Japanese should produce different counts for tiktoken."""
        en_results, _, _ = await self.service.batch_analyze(
            text=GOLDEN_ENGLISH_TEXT,
            language="en",
            tokenizer_names=["tiktoken_cl100k"],
        )
        ja_results, _, _ = await self.service.batch_analyze(
            text=GOLDEN_JAPANESE_TEXT,
            language="ja",
            tokenizer_names=["tiktoken_cl100k"],
        )
        # Different texts → different token counts
        assert en_results[0].token_count != ja_results[0].token_count


class TestCacheBypass:
    """Tests that service works correctly with cache_service=None."""

    def setup_method(self):
        self.service = TokenizerService(cache_service=None)

    @pytest.mark.asyncio
    async def test_no_cache_still_works(self):
        results, errors, _ = await self.service.batch_analyze(
            text=GOLDEN_ENGLISH_TEXT,
            language="en",
            tokenizer_names=["tiktoken_cl100k"],
        )
        assert len(results) == 1
        assert results[0].token_count > 0
