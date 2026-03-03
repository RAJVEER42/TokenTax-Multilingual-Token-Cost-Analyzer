"""
TikToken Adapter (GPT family)

Uses OpenAI's tiktoken library with the cl100k_base encoding
(GPT-4, GPT-3.5-turbo).

Single Responsibility: translate text → token count via tiktoken.

Design decisions:
- Encoding is loaded lazily on first call and cached for the process lifetime.
- Version is read from tiktoken.__version__ at import time so it's always
  accurate even after pip upgrades.
- tokenize() never raises — catches all exceptions and returns -1.
"""

import structlog
import tiktoken

from app.schemas.tokenizer import ConfidenceLevel

logger = structlog.get_logger(__name__)


class TikTokenAdapter:
    """Adapter for OpenAI tiktoken (cl100k_base encoding)."""

    _encoding: tiktoken.Encoding | None = None

    @property
    def name(self) -> str:
        return "tiktoken_cl100k"

    @property
    def version(self) -> str:
        return tiktoken.__version__

    @property
    def confidence(self) -> ConfidenceLevel:
        return ConfidenceLevel.EXACT

    @property
    def display_name(self) -> str:
        return "GPT-4 / GPT-3.5 (tiktoken cl100k_base)"

    @property
    def description(self) -> str:
        return (
            "OpenAI's BPE tokenizer used by GPT-4 and GPT-3.5-turbo. "
            "Encoding: cl100k_base."
        )

    def _get_encoding(self) -> tiktoken.Encoding:
        """Lazy-load and cache the encoding."""
        if self._encoding is None:
            self._encoding = tiktoken.get_encoding("cl100k_base")
            logger.info(
                "tokenizer.tiktoken.loaded",
                encoding="cl100k_base",
                version=self.version,
            )
        return self._encoding

    def tokenize(self, text: str) -> int:
        """
        Count tokens using tiktoken cl100k_base.
        Returns -1 on any internal failure.
        """
        try:
            encoding = self._get_encoding()
            tokens = encoding.encode(text, disallowed_special=())
            return len(tokens)
        except Exception as e:
            logger.error(
                "tokenizer.tiktoken.error",
                error=str(e),
                text_length=len(text),
            )
            return -1
