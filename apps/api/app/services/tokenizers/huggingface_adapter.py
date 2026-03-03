"""
Hugging Face GPT-2 Tokenizer Adapter

Uses the `transformers` library AutoTokenizer to load GPT-2's BPE tokenizer.
This serves as an additional open-source BPE baseline.

Single Responsibility: translate text → token count via HuggingFace GPT-2 tokenizer.

Design decisions:
- GPT-2 tokenizer is well-studied BPE with known biases, making it a
  useful reference point alongside tiktoken.
- Model is loaded lazily on first call and cached in-process.
- If transformers is not installed or model download fails, adapter
  degrades gracefully (returns -1).
- We set TOKENIZERS_PARALLELISM=false to avoid fork-safety warnings
  in async environments.
"""

import os

import structlog

from app.schemas.tokenizer import ConfidenceLevel

logger = structlog.get_logger(__name__)

# Avoid HuggingFace parallelism warning in async context
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")


class HuggingFaceGPT2Adapter:
    """Adapter for HuggingFace GPT-2 BPE tokenizer."""

    _tokenizer = None
    _loaded: bool = False
    _load_error: str | None = None
    _version: str = "unknown"

    @property
    def name(self) -> str:
        return "huggingface_gpt2"

    @property
    def version(self) -> str:
        return self._version

    @property
    def confidence(self) -> ConfidenceLevel:
        return ConfidenceLevel.EXACT

    @property
    def display_name(self) -> str:
        return "GPT-2 (HuggingFace BPE)"

    @property
    def description(self) -> str:
        return (
            "OpenAI GPT-2 BPE tokenizer loaded via HuggingFace transformers. "
            "Well-studied baseline for BPE bias analysis."
        )

    def _load_tokenizer(self):
        """Lazy-load the GPT-2 tokenizer."""
        if self._loaded:
            return self._tokenizer
        self._loaded = True
        try:
            from transformers import AutoTokenizer
            import transformers

            self._version = transformers.__version__
            self._tokenizer = AutoTokenizer.from_pretrained(
                "gpt2", use_fast=True
            )
            logger.info(
                "tokenizer.huggingface_gpt2.loaded",
                version=self._version,
                vocab_size=self._tokenizer.vocab_size,
            )
            return self._tokenizer
        except Exception as e:
            self._load_error = str(e)
            logger.error(
                "tokenizer.huggingface_gpt2.load_error", error=str(e)
            )
            return None

    def tokenize(self, text: str) -> int:
        """
        Count tokens using GPT-2 BPE tokenizer.
        Returns -1 if model unavailable or on any failure.
        """
        try:
            tokenizer = self._load_tokenizer()
            if tokenizer is None:
                return -1
            token_ids = tokenizer.encode(text, add_special_tokens=False)
            return len(token_ids)
        except Exception as e:
            logger.error(
                "tokenizer.huggingface_gpt2.error",
                error=str(e),
                text_length=len(text),
            )
            return -1

    def encode_to_ids(self, text: str) -> list[int] | None:
        """
        Return raw token IDs for glitch detection.
        Uses same encode path as tokenize() for consistency.
        """
        try:
            tokenizer = self._load_tokenizer()
            if tokenizer is None:
                return None
            return tokenizer.encode(text, add_special_tokens=False)
        except Exception as e:
            logger.error(
                "tokenizer.huggingface_gpt2.encode_to_ids_error",
                error=str(e),
                text_length=len(text),
            )
            return None
