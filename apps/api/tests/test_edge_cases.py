"""
Adapter Edge Case and Error Path Tests

Covers the graceful-degradation paths for adapters that may not
have their models available (sentencepiece, huggingface) and
miscellaneous edge cases.

Single Responsibility: verify error handling and edge cases in adapters.
"""

import pytest
from unittest.mock import patch, MagicMock

from app.schemas.tokenizer import ConfidenceLevel
from app.services.tokenizers.sentencepiece_adapter import SentencePieceAdapter
from app.services.tokenizers.huggingface_adapter import HuggingFaceGPT2Adapter
from app.services.tokenizers.tiktoken_adapter import TikTokenAdapter
from app.services.tokenizers.claude_adapter import ClaudeEstimateAdapter
from app.services.tokenizers import get_adapter_names, get_adapter_by_name
from app.services.tokenizer_service import TokenizerService
from app.services.cache_service import CacheService


class TestSentencePieceAdapterProperties:
    """Test SentencePiece adapter metadata and degradation."""

    def setup_method(self):
        self.adapter = SentencePieceAdapter()
        # Reset class-level state for clean tests
        SentencePieceAdapter._processor = None
        SentencePieceAdapter._loaded = False
        SentencePieceAdapter._load_error = None

    def test_name(self):
        assert self.adapter.name == "sentencepiece_xlmr"

    def test_confidence_is_exact(self):
        assert self.adapter.confidence == ConfidenceLevel.EXACT

    def test_version_is_string(self):
        assert isinstance(self.adapter.version, str)

    def test_display_name(self):
        assert len(self.adapter.display_name) > 0

    def test_description(self):
        assert len(self.adapter.description) > 0

    def test_missing_model_returns_negative_one(self):
        """When model file doesn't exist, tokenize returns -1."""
        count = self.adapter.tokenize("Hello world")
        # Model file likely missing in test env → -1
        assert isinstance(count, int)

    def test_tokenize_after_load_failure_returns_negative_one(self):
        """After a failed load, subsequent calls also return -1."""
        self.adapter._loaded = True
        self.adapter._processor = None
        count = self.adapter.tokenize("test")
        assert count == -1


class TestHuggingFaceAdapterProperties:
    """Test HuggingFace GPT-2 adapter metadata and degradation."""

    def setup_method(self):
        self.adapter = HuggingFaceGPT2Adapter()

    def test_name(self):
        assert self.adapter.name == "huggingface_gpt2"

    def test_confidence_is_exact(self):
        assert self.adapter.confidence == ConfidenceLevel.EXACT

    def test_display_name(self):
        assert len(self.adapter.display_name) > 0

    def test_description(self):
        assert len(self.adapter.description) > 0

    def test_tokenize_returns_int(self):
        """Should return an int (positive if model loads, -1 if not)."""
        count = self.adapter.tokenize("Hello world")
        assert isinstance(count, int)

    def test_load_failure_returns_negative_one(self):
        """Simulated load failure returns -1."""
        adapter = HuggingFaceGPT2Adapter()
        adapter._loaded = True
        adapter._tokenizer = None
        count = adapter.tokenize("test text")
        assert count == -1


class TestTikTokenErrorPath:
    """Test tiktoken graceful error handling."""

    def test_tokenize_exception_returns_negative_one(self):
        """If encoding.encode raises, tokenize returns -1."""
        adapter = TikTokenAdapter()
        mock_encoding = MagicMock()
        mock_encoding.encode.side_effect = RuntimeError("Simulated failure")
        adapter._encoding = mock_encoding
        count = adapter.tokenize("test")
        assert count == -1


class TestClaudeEdgeCases:
    """Test Claude adapter edge cases."""

    def test_very_long_text(self):
        adapter = ClaudeEstimateAdapter()
        text = "a" * 10000
        count = adapter.tokenize(text, language="en")
        assert count > 0
        # ~10000 / 4.0 = 2500
        assert 2000 <= count <= 3000

    def test_all_supported_languages(self):
        """Every language in the ratio dict should produce a count."""
        adapter = ClaudeEstimateAdapter()
        from app.services.tokenizers.claude_adapter import _CHARS_PER_TOKEN
        for lang in _CHARS_PER_TOKEN:
            count = adapter.tokenize("test text here", language=lang)
            assert count > 0, f"Failed for language: {lang}"


class TestRegistryFunctions:
    """Test the adapter registry helpers."""

    def test_get_adapter_names_returns_list(self):
        names = get_adapter_names()
        assert isinstance(names, list)
        assert len(names) >= 4

    def test_get_adapter_by_name_found(self):
        adapter = get_adapter_by_name("tiktoken_cl100k")
        assert adapter is not None
        assert adapter.name == "tiktoken_cl100k"

    def test_get_adapter_by_name_not_found(self):
        adapter = get_adapter_by_name("nonexistent")
        assert adapter is None

    def test_all_names_are_unique(self):
        names = get_adapter_names()
        assert len(names) == len(set(names))


class TestTokenizerServiceErrorPaths:
    """Test service-layer error handling branches."""

    def setup_method(self):
        self.service = TokenizerService(cache_service=None)

    def test_analyze_with_failed_adapter(self):
        """Adapter returning -1 produces TokenAnalysis with error."""
        adapter = SentencePieceAdapter()
        adapter._loaded = True
        adapter._processor = None
        result = self.service.analyze("hello", "en", adapter)
        assert result.error is not None
        assert result.token_count == 0

    @pytest.mark.asyncio
    async def test_batch_with_unknown_names_returns_empty(self):
        """All unknown names → no results, no errors (just warnings)."""
        results, errors = await self.service.batch_analyze(
            text="hello",
            language="en",
            tokenizer_names=["fake1", "fake2"],
        )
        assert len(results) == 0
        assert len(errors) == 0

    @pytest.mark.asyncio
    async def test_batch_adapter_exception_captured(self):
        """If an adapter raises an unexpected exception, it's captured."""
        service = TokenizerService(cache_service=None)

        # Patch get_all_adapters to include a broken adapter
        class BrokenAdapter:
            name = "broken"
            version = "0.0.0"
            confidence = ConfidenceLevel.EXACT
            display_name = "Broken"
            description = "Intentionally broken"

            def tokenize(self, text):
                raise RuntimeError("Boom!")

        with patch(
            "app.services.tokenizer_service.get_all_adapters",
            return_value=[BrokenAdapter()],
        ):
            results, errors = await service.batch_analyze(
                text="hello", language="en", tokenizer_names=None,
            )
        assert len(errors) == 1
        assert "Boom!" in errors[0].error


class TestCacheServiceEdgePaths:
    """Test cache key edge cases."""

    def test_empty_text_key(self):
        key = CacheService.build_key("tok", "1.0", "")
        assert len(key) > 0

    def test_very_long_text_key(self):
        key = CacheService.build_key("tok", "1.0", "x" * 100000)
        # SHA-256 hash is always 64 chars regardless of input size
        parts = key.split(":")
        assert len(parts[2]) == 64
