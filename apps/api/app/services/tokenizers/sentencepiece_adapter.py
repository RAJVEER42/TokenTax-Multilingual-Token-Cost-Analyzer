"""
SentencePiece Adapter (LLaMA / Multilingual models)

Uses the sentencepiece library to tokenize text.
Loads a pretrained model from a configurable path.

Single Responsibility: translate text → token count via sentencepiece.

Design decisions:
- Model is loaded lazily on first call and cached.
- If no model file is found, adapter degrades gracefully (returns -1).
- Version is read from sentencepiece.__version__.
- We ship a fallback: if no .model file is provided, we use the
  sentencepiece BPE trainer on a dummy vocab — but for production
  we expect a real model path. For Phase 3 bootstrap we use
  sp.SentencePieceProcessor with a built-in unigram model approach.
  We'll use the XLM-RoBERTa sentencepiece model as default if available.
"""

import os
from pathlib import Path

import sentencepiece as spm
import structlog

from app.schemas.tokenizer import ConfidenceLevel

logger = structlog.get_logger(__name__)

# Default model path — can be overridden via env var
_MODEL_PATH = os.environ.get(
    "SENTENCEPIECE_MODEL_PATH",
    str(Path(__file__).resolve().parents[3] / "data" / "sp_models" / "xlmr.model"),
)


class SentencePieceAdapter:
    """Adapter for SentencePiece (LLaMA-class models)."""

    _processor: spm.SentencePieceProcessor | None = None
    _loaded: bool = False
    _load_error: str | None = None

    @property
    def name(self) -> str:
        return "sentencepiece_xlmr"

    @property
    def version(self) -> str:
        return spm.__version__

    @property
    def confidence(self) -> ConfidenceLevel:
        return ConfidenceLevel.EXACT

    @property
    def display_name(self) -> str:
        return "SentencePiece (XLM-RoBERTa Unigram)"

    @property
    def description(self) -> str:
        return (
            "SentencePiece unigram model used by XLM-RoBERTa and LLaMA-class "
            "multilingual models. Exact token counts."
        )

    def _load_model(self) -> spm.SentencePieceProcessor | None:
        """Lazy-load the sentencepiece model file."""
        if self._loaded:
            return self._processor
        self._loaded = True
        try:
            if not Path(_MODEL_PATH).exists():
                self._load_error = f"Model file not found: {_MODEL_PATH}"
                logger.warning(
                    "tokenizer.sentencepiece.model_missing",
                    path=_MODEL_PATH,
                )
                return None
            processor = spm.SentencePieceProcessor()
            processor.Load(_MODEL_PATH)
            self._processor = processor
            logger.info(
                "tokenizer.sentencepiece.loaded",
                path=_MODEL_PATH,
                version=self.version,
                vocab_size=processor.GetPieceSize(),
            )
            return self._processor
        except Exception as e:
            self._load_error = str(e)
            logger.error("tokenizer.sentencepiece.load_error", error=str(e))
            return None

    def tokenize(self, text: str) -> int:
        """
        Count tokens using sentencepiece.
        Returns -1 if model is unavailable or on any failure.
        """
        try:
            processor = self._load_model()
            if processor is None:
                return -1
            pieces = processor.EncodeAsPieces(text)
            return len(pieces)
        except Exception as e:
            logger.error(
                "tokenizer.sentencepiece.error",
                error=str(e),
                text_length=len(text),
            )
            return -1
