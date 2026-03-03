"""
Base Tokenizer Protocol

Defines the contract that every tokenizer adapter must satisfy.
Single Responsibility: specify the adapter interface.

Design decisions:
- Protocol (structural subtyping) over ABC so adapters don't need to
  import or inherit from a shared base — they just need to match the shape.
- Each adapter self-reports its name, version, and confidence level.
- tokenize() returns raw token count; the service layer builds TokenAnalysis.
- encode_to_ids() returns the actual token ID list (or None if unsupported).
  This is used by GlitchTokenService for O(n) glitch scanning without
  re-encoding.  Adapters that cannot expose IDs return None.
- All adapters must be deterministic for the same (text, version) pair.
"""

from typing import Protocol, runtime_checkable

from app.schemas.tokenizer import ConfidenceLevel


@runtime_checkable
class TokenizerAdapter(Protocol):
    """
    Structural interface for all tokenizer backends.

    Any class with these attributes and methods is a valid adapter —
    no inheritance required (duck typing + Protocol).
    """

    @property
    def name(self) -> str:
        """Unique identifier for this tokenizer (e.g. 'tiktoken_cl100k')."""
        ...

    @property
    def version(self) -> str:
        """Pinned version string of the underlying library/model."""
        ...

    @property
    def confidence(self) -> ConfidenceLevel:
        """Whether this adapter produces EXACT or ESTIMATED counts."""
        ...

    @property
    def display_name(self) -> str:
        """Human-readable name for UI display."""
        ...

    @property
    def description(self) -> str:
        """Short description of the tokenizer."""
        ...

    def tokenize(self, text: str) -> int:
        """
        Count the number of tokens in `text`.

        Precondition: `text` is already NFC-normalized.
        Must be deterministic: same text → same count.
        Must not raise — return -1 on internal failure (caller handles).
        """
        ...

    def encode_to_ids(self, text: str) -> list[int] | None:
        """
        Return the actual token ID list for `text`, or None if unsupported.

        Used by GlitchTokenService for O(n) scanning without re-encoding.
        Adapters that cannot expose raw token IDs (e.g. heuristic estimators)
        should return None.

        Precondition: `text` is already NFC-normalized.
        Must not raise — return None on internal failure.
        """
        ...
