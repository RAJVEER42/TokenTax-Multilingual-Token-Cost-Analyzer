"""
Tokenizer Service

Orchestrates tokenization across all registered adapters.
Single Responsibility: coordinate adapters, apply normalization,
build TokenAnalysis results.

Design decisions:
- This is the *orchestrator*, not the tokenizer. It delegates to adapters.
  This satisfies Dependency Inversion: high-level policy (service) depends
  on abstractions (TokenizerAdapter protocol), not concrete implementations.
- Unicode NFC normalization is applied ONCE here before dispatching to
  adapters. Adapters can assume pre-normalized input.
- batch_analyze processes all tokenizers for a given text. Partial failures
  are captured as TokenizerError objects — a single adapter crash never
  brings down the entire request.
- Results are sorted by adapter name for deterministic JSON output.
- Claude adapter receives language hint for its heuristic; all others
  ignore it (they're language-agnostic at the BPE level).
"""

import unicodedata

import structlog

from app.core.constants import UNICODE_NORMALIZATION_FORM
from app.schemas.tokenizer import ConfidenceLevel, TokenAnalysis
from app.schemas.analysis import TokenizerError
from app.services.cache_service import CacheService
from app.services.tokenizers import (
    get_adapter_by_name,
    get_all_adapters,
)
from app.services.tokenizers.base import TokenizerAdapter
from app.services.tokenizers.claude_adapter import ClaudeEstimateAdapter

logger = structlog.get_logger(__name__)


class TokenizerService:
    """
    Core tokenization orchestrator.

    Normalizes input, dispatches to adapters, handles partial failures,
    and returns deterministic, sorted results.
    """

    def __init__(self, cache_service: CacheService | None = None) -> None:
        self._cache = cache_service

    @staticmethod
    def normalize_text(text: str) -> str:
        """Apply Unicode NFC normalization for deterministic tokenization."""
        return unicodedata.normalize(UNICODE_NORMALIZATION_FORM, text)

    def _run_adapter(
        self,
        adapter: TokenizerAdapter,
        text: str,
        language: str,
    ) -> int:
        """
        Run a single adapter. Handles the Claude special case
        (language-aware heuristic) transparently.
        """
        if isinstance(adapter, ClaudeEstimateAdapter):
            return adapter.tokenize(text, language=language)
        return adapter.tokenize(text)

    def analyze(
        self,
        text: str,
        language: str,
        adapter: TokenizerAdapter,
    ) -> TokenAnalysis:
        """
        Tokenize text with a single adapter and return a TokenAnalysis.

        Preconditions:
        - text should already be NFC-normalized (caller's responsibility
          if calling directly; batch_analyze normalizes automatically).
        """
        char_count = len(text)
        token_count = self._run_adapter(adapter, text, language)

        if token_count < 0:
            return TokenAnalysis(
                tokenizer_name=adapter.name,
                tokenizer_version=adapter.version,
                token_count=0,
                char_count=char_count,
                efficiency_ratio=0.0,
                confidence=adapter.confidence,
                language=language,
                error=f"Tokenizer {adapter.name} failed internally",
            )

        efficiency = TokenAnalysis.compute_efficiency(token_count, char_count)

        return TokenAnalysis(
            tokenizer_name=adapter.name,
            tokenizer_version=adapter.version,
            token_count=token_count,
            char_count=char_count,
            efficiency_ratio=efficiency,
            confidence=adapter.confidence,
            language=language,
        )

    async def batch_analyze(
        self,
        text: str,
        language: str,
        tokenizer_names: list[str] | None = None,
    ) -> tuple[list[TokenAnalysis], list[TokenizerError]]:
        """
        Tokenize text across multiple (or all) adapters.

        Returns:
            (results, errors) — both lists sorted by adapter name.

        Behavior:
        - Applies NFC normalization once.
        - Checks cache before running each adapter.
        - Stores results in cache after computation.
        - A single adapter failure is captured in `errors`; other
          adapters continue processing.
        """
        normalized = self.normalize_text(text)
        adapters = self._resolve_adapters(tokenizer_names)
        results: list[TokenAnalysis] = []
        errors: list[TokenizerError] = []

        for adapter in adapters:
            try:
                # Check cache first
                cached = await self._try_cache_get(adapter, normalized)
                if cached is not None:
                    results.append(cached)
                    continue

                analysis = self.analyze(normalized, language, adapter)

                if analysis.error:
                    errors.append(TokenizerError(
                        tokenizer_name=adapter.name,
                        error=analysis.error,
                    ))
                else:
                    results.append(analysis)
                    await self._try_cache_set(adapter, normalized, analysis)

            except Exception as e:
                logger.error(
                    "tokenizer.batch.adapter_error",
                    adapter=adapter.name,
                    error=str(e),
                )
                errors.append(TokenizerError(
                    tokenizer_name=adapter.name,
                    error=str(e),
                ))

        # Sort for deterministic output ordering
        results.sort(key=lambda r: r.tokenizer_name)
        errors.sort(key=lambda e: e.tokenizer_name)
        return results, errors

    def _resolve_adapters(
        self, names: list[str] | None
    ) -> list[TokenizerAdapter]:
        """
        Resolve adapter instances from optional name filter.
        If names is None, return all registered adapters.
        Unknown names are silently skipped (logged as warning).
        """
        if names is None:
            return get_all_adapters()

        adapters: list[TokenizerAdapter] = []
        for name in names:
            adapter = get_adapter_by_name(name)
            if adapter is None:
                logger.warning("tokenizer.unknown_name", name=name)
            else:
                adapters.append(adapter)
        return adapters

    async def _try_cache_get(
        self, adapter: TokenizerAdapter, text: str
    ) -> TokenAnalysis | None:
        """Attempt cache read; return None on miss or if cache is disabled."""
        if self._cache is None:
            return None
        cached_dict = await self._cache.get(
            adapter.name, adapter.version, text
        )
        if cached_dict is None:
            return None
        try:
            return TokenAnalysis(**cached_dict)
        except Exception as e:
            logger.warning("cache.deserialize_error", error=str(e))
            return None

    async def _try_cache_set(
        self, adapter: TokenizerAdapter, text: str, analysis: TokenAnalysis
    ) -> None:
        """Attempt cache write; fail silently if cache is disabled."""
        if self._cache is None:
            return
        await self._cache.set(
            adapter.name, adapter.version, text, analysis.model_dump()
        )
