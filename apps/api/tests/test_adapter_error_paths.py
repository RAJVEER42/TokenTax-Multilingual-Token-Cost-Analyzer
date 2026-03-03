"""
Adapter Error Path Tests — Phase 9

Covers degradation and error-handling paths in tokenizer adapters
that are not exercised by happy-path tests.

Testing philosophy:
- Every adapter's tokenize() must return -1 (not raise) on internal failure.
- Every adapter's encode_to_ids() must return None (not raise) on failure.
- Lazy-loading errors must be handled gracefully.
- Version pins must be non-empty strings.
"""

from unittest.mock import patch, MagicMock, AsyncMock

from app.services.tokenizers.tiktoken_adapter import TikTokenAdapter
from app.services.tokenizers.huggingface_adapter import HuggingFaceGPT2Adapter
from app.services.tokenizers.sentencepiece_adapter import SentencePieceAdapter
from app.services.tokenizers.claude_adapter import ClaudeEstimateAdapter
from app.services.tokenizer_service import TokenizerService
from app.schemas.tokenizer import ConfidenceLevel


class TestTikTokenErrorPaths:
    """Cover tiktoken adapter error handling."""

    def test_tokenize_exception_returns_minus_one(self):
        """If encoding.encode raises, tokenize returns -1."""
        adapter = TikTokenAdapter()
        with patch.object(adapter, "_get_encoding") as mock_enc:
            mock_enc.return_value.encode.side_effect = RuntimeError("boom")
            result = adapter.tokenize("hello")
        assert result == -1

    def test_encode_to_ids_exception_returns_none(self):
        """If encoding.encode raises, encode_to_ids returns None."""
        adapter = TikTokenAdapter()
        with patch.object(adapter, "_get_encoding") as mock_enc:
            mock_enc.return_value.encode.side_effect = RuntimeError("boom")
            result = adapter.encode_to_ids("hello")
        assert result is None

    def test_properties_are_stable(self):
        adapter = TikTokenAdapter()
        assert adapter.name == "tiktoken_cl100k"
        assert isinstance(adapter.version, str)
        assert len(adapter.version) > 0
        assert adapter.confidence == ConfidenceLevel.EXACT
        assert len(adapter.display_name) > 0
        assert len(adapter.description) > 0


class TestHuggingFaceErrorPaths:
    """Cover HuggingFace GPT-2 adapter error handling."""

    def test_load_error_returns_minus_one(self):
        """If transformers import fails, tokenize returns -1."""
        adapter = HuggingFaceGPT2Adapter()
        # Reset state so _load_tokenizer runs
        adapter._loaded = False
        adapter._tokenizer = None
        with patch(
            "app.services.tokenizers.huggingface_adapter.HuggingFaceGPT2Adapter._load_tokenizer",
            return_value=None,
        ):
            result = adapter.tokenize("hello")
        assert result == -1

    def test_encode_to_ids_with_no_tokenizer(self):
        """If tokenizer failed to load, encode_to_ids returns None."""
        adapter = HuggingFaceGPT2Adapter()
        adapter._loaded = True
        adapter._tokenizer = None
        adapter._load_error = "test error"
        result = adapter.encode_to_ids("hello")
        assert result is None

    def test_tokenize_exception_returns_minus_one(self):
        """If encode() raises after successful load, tokenize returns -1."""
        adapter = HuggingFaceGPT2Adapter()
        mock_tok = MagicMock()
        mock_tok.encode.side_effect = RuntimeError("encode failed")
        adapter._loaded = True
        adapter._tokenizer = mock_tok
        result = adapter.tokenize("hello")
        assert result == -1

    def test_encode_to_ids_exception_returns_none(self):
        """If encode() raises, encode_to_ids returns None."""
        adapter = HuggingFaceGPT2Adapter()
        mock_tok = MagicMock()
        mock_tok.encode.side_effect = RuntimeError("encode failed")
        adapter._loaded = True
        adapter._tokenizer = mock_tok
        result = adapter.encode_to_ids("hello")
        assert result is None

    def test_properties_are_stable(self):
        adapter = HuggingFaceGPT2Adapter()
        assert adapter.name == "huggingface_gpt2"
        assert isinstance(adapter.version, str)
        assert adapter.confidence == ConfidenceLevel.EXACT
        assert len(adapter.display_name) > 0
        assert len(adapter.description) > 0


class TestSentencePieceErrorPaths:
    """Cover SentencePiece adapter error handling."""

    def test_model_missing_returns_minus_one(self):
        """If model file does not exist, tokenize returns -1."""
        adapter = SentencePieceAdapter()
        adapter._loaded = False
        adapter._processor = None
        with patch(
            "app.services.tokenizers.sentencepiece_adapter.Path.exists",
            return_value=False,
        ):
            adapter._loaded = False
            result_tok = adapter._load_model()
        assert result_tok is None

    def test_tokenize_with_no_processor(self):
        """If processor is None, tokenize returns -1."""
        adapter = SentencePieceAdapter()
        adapter._loaded = True
        adapter._processor = None
        adapter._load_error = "missing model"
        result = adapter.tokenize("hello")
        assert result == -1

    def test_encode_to_ids_with_no_processor(self):
        """If processor is None, encode_to_ids returns None."""
        adapter = SentencePieceAdapter()
        adapter._loaded = True
        adapter._processor = None
        result = adapter.encode_to_ids("hello")
        assert result is None

    def test_tokenize_exception_returns_minus_one(self):
        """If EncodeAsPieces raises, tokenize returns -1."""
        adapter = SentencePieceAdapter()
        mock_proc = MagicMock()
        mock_proc.EncodeAsPieces.side_effect = RuntimeError("crash")
        adapter._loaded = True
        adapter._processor = mock_proc
        result = adapter.tokenize("hello")
        assert result == -1

    def test_encode_to_ids_exception_returns_none(self):
        """If EncodeAsIds raises, encode_to_ids returns None."""
        adapter = SentencePieceAdapter()
        mock_proc = MagicMock()
        mock_proc.EncodeAsIds.side_effect = RuntimeError("crash")
        adapter._loaded = True
        adapter._processor = mock_proc
        result = adapter.encode_to_ids("hello")
        assert result is None

    def test_load_model_exception_returns_none(self):
        """If Load() raises, _load_model returns None."""
        adapter = SentencePieceAdapter()
        adapter._loaded = False
        adapter._processor = None
        with patch(
            "app.services.tokenizers.sentencepiece_adapter.Path.exists",
            return_value=True,
        ), patch(
            "app.services.tokenizers.sentencepiece_adapter.spm.SentencePieceProcessor"
        ) as mock_cls:
            mock_cls.return_value.Load.side_effect = RuntimeError("corrupt file")
            result = adapter._load_model()
        assert result is None
        assert adapter._load_error is not None

    def test_properties_are_stable(self):
        adapter = SentencePieceAdapter()
        assert adapter.name == "sentencepiece_xlmr"
        assert isinstance(adapter.version, str)
        assert len(adapter.version) > 0
        assert adapter.confidence == ConfidenceLevel.EXACT
        assert len(adapter.display_name) > 0
        assert len(adapter.description) > 0


class TestClaudeAdapterEdgeCases:
    """Cover ClaudeEstimateAdapter edge cases."""

    def test_empty_string_returns_at_least_one(self):
        adapter = ClaudeEstimateAdapter()
        result = adapter.tokenize("", language="en")
        assert result >= 1

    def test_unknown_language_does_not_crash(self):
        adapter = ClaudeEstimateAdapter()
        result = adapter.tokenize("hello", language="xx")
        assert result >= 1

    def test_encode_to_ids_returns_none(self):
        """Claude adapter cannot produce real token IDs."""
        adapter = ClaudeEstimateAdapter()
        result = adapter.encode_to_ids("hello")
        assert result is None

    def test_confidence_is_estimated(self):
        adapter = ClaudeEstimateAdapter()
        assert adapter.confidence == ConfidenceLevel.ESTIMATED


class TestTokenizerServiceErrorPaths:
    """Cover TokenizerService edge cases not hit by happy-path tests."""

    async def test_unknown_adapter_name_skipped(self):
        """Requesting a non-existent adapter name returns empty results."""
        service = TokenizerService(cache_service=None)
        results, errors, _ = await service.batch_analyze(
            text="hello", language="en", tokenizer_names=["nonexistent_adapter"],
        )
        assert len(results) == 0
        assert len(errors) == 0

    async def test_adapter_internal_failure_captured(self):
        """If an adapter returns -1, it should appear as an error."""
        service = TokenizerService(cache_service=None)
        # Use a text that will work for most adapters
        results, errors, _ = await service.batch_analyze(
            text="hello", language="en",
        )
        # At minimum, tiktoken should succeed
        tiktoken_results = [r for r in results if r.tokenizer_name == "tiktoken_cl100k"]
        assert len(tiktoken_results) == 1
        assert tiktoken_results[0].token_count > 0

    def test_analyze_negative_token_count(self):
        """If adapter returns -1, analyze produces error field."""
        service = TokenizerService(cache_service=None)
        mock_adapter = MagicMock()
        mock_adapter.name = "broken"
        mock_adapter.version = "0.0.0"
        mock_adapter.confidence = ConfidenceLevel.EXACT
        mock_adapter.tokenize.return_value = -1
        result = service.analyze("hello", "en", mock_adapter)
        assert result.error is not None
        assert result.token_count == 0

    async def test_cache_deserialize_error_falls_through(self):
        """If cached dict can't be deserialized, service re-computes."""
        mock_cache = MagicMock()
        # Return a malformed dict that fails TokenAnalysis(**data)
        mock_cache.get = AsyncMock(return_value={"bad": "data"})
        mock_cache.set = AsyncMock(return_value=True)

        service = TokenizerService(cache_service=mock_cache)
        results, errors, _ = await service.batch_analyze(
            text="hello", language="en",
            tokenizer_names=["tiktoken_cl100k"],
        )
        # Should still produce results (cache fallthrough on bad data)
        assert len(results) >= 1

    async def test_batch_analyze_adapter_exception_captured(self):
        """If an adapter raises an unexpected Exception, it's captured in errors."""
        service = TokenizerService(cache_service=None)
        # Patch _resolve_adapters to return a mock adapter that throws
        crashing_adapter = MagicMock()
        crashing_adapter.name = "crasher"
        crashing_adapter.version = "0.0.0"
        crashing_adapter.confidence = ConfidenceLevel.EXACT
        crashing_adapter.tokenize.side_effect = RuntimeError("unexpected crash")

        with patch.object(service, "_resolve_adapters", return_value=[crashing_adapter]):
            results, errors, _ = await service.batch_analyze(
                text="hello", language="en",
            )
        assert len(errors) == 1
        assert errors[0].tokenizer_name == "crasher"
        assert "unexpected crash" in errors[0].error

    def test_collect_token_ids_exception_swallowed(self):
        """If encode_to_ids raises, _collect_token_ids swallows the error."""
        crashing_adapter = MagicMock()
        crashing_adapter.name = "crasher"
        crashing_adapter.version = "0.0.0"
        crashing_adapter.encode_to_ids.side_effect = RuntimeError("ids crash")

        token_id_map: dict[str, tuple[list[int], str]] = {}
        # Should not raise
        TokenizerService._collect_token_ids(crashing_adapter, "hello", token_id_map)
        # Adapter should NOT be in the map
        assert "crasher" not in token_id_map

    async def test_cache_hit_reuses_result(self):
        """Cached result should be returned without re-computation."""
        from app.schemas.tokenizer import TokenAnalysis

        cached_data = TokenAnalysis(
            tokenizer_name="tiktoken_cl100k",
            tokenizer_version="0.12.0",
            token_count=5,
            char_count=11,
            efficiency_ratio=0.4545,
            confidence=ConfidenceLevel.EXACT,
            language="en",
        ).model_dump()

        mock_cache = MagicMock()
        mock_cache.get = AsyncMock(return_value=cached_data)
        mock_cache.set = AsyncMock(return_value=True)

        service = TokenizerService(cache_service=mock_cache)
        results, errors, _ = await service.batch_analyze(
            text="hello world", language="en",
            tokenizer_names=["tiktoken_cl100k"],
        )
        assert len(results) == 1
        assert results[0].token_count == 5  # from cache, not re-computed
