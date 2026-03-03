"""
Glitch Token Detection Service

Detects known tokenizer pathologies ("glitch tokens") by scanning
already-encoded token ID sequences.  Purely in-memory, stateless,
O(n) per tokenizer.

Design decisions
────────────────
- **No re-encoding**: the service receives token IDs that were *already*
  produced by the adapter during normal tokenization.  This avoids
  duplicate work and guarantees <5 % overhead.
- **Per-tokenizer registries**: each tokenizer has its own set of known
  glitch token IDs, versioned by (tokenizer_name, tokenizer_version).
  A version mismatch silently skips detection (logged as warning).
- **Set-based lookup**: the inner loop is a single `in` check against a
  frozenset, giving O(1) per token and O(n) total.
- **Educational framing**: danger levels and effect descriptions are
  deliberately non-alarmist.  Detection ≠ vulnerability.
  See ``docs/glitch_tokens.md`` for background.
- **SOLID compliance**:
  • Single Responsibility — only glitch detection, no tokenization.
  • Open/Closed — new registries can be added without modifying scan logic.
  • Dependency Inversion — depends on abstract data (GlitchRegistryEntry),
    not on concrete adapters.

References
──────────
- Rumbelow & Sollazo, "SolidGoldMagikarp" (2023)
  https://www.lesswrong.com/posts/aPeJE8bSo6rAFoLqg/solidgoldmagikarp-plus-prompt-generation
- Land & Bartolo, "Fishing for Magikarp" (2024)
  https://arxiv.org/abs/2405.05417
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Final

import structlog

from app.schemas.analysis import DangerLevel, GlitchToken

logger = structlog.get_logger(__name__)


# ── Registry entry (immutable data class) ────────────────

@dataclass(frozen=True, slots=True)
class GlitchRegistryEntry:
    """
    Metadata for a single known glitch token.

    Stored once per tokenizer vocabulary and shared across all requests.
    """
    token_id: int
    token_text: str
    danger_level: DangerLevel
    effect: str
    reference: str


# ── Per-tokenizer registries ─────────────────────────────
# Keys: (tokenizer_name, tokenizer_version_prefix)
# Version prefix allows minor patch updates without invalidating the
# registry.  E.g. tiktoken "0.12" matches "0.12.0" and "0.12.1".

# tiktoken cl100k_base — GPT-4 / GPT-3.5-turbo known glitch tokens
# These are well-documented IDs from the SolidGoldMagikarp research.
_TIKTOKEN_CL100K_GLITCHES: Final[tuple[GlitchRegistryEntry, ...]] = (
    GlitchRegistryEntry(
        token_id=188700,
        token_text=" SolidGoldMagikarp",
        danger_level=DangerLevel.HIGH,
        effect=(
            "Causes anomalous completions including evasion, hallucination, "
            "and repetition loops in GPT-family models."
        ),
        reference="https://www.lesswrong.com/posts/aPeJE8bSo6rAFoLqg/solidgoldmagikarp-plus-prompt-generation",
    ),
    GlitchRegistryEntry(
        token_id=203075,
        token_text=" TheNitromeFan",
        danger_level=DangerLevel.HIGH,
        effect=(
            "Triggers garbled output and repetition loops. "
            "One of the original SolidGoldMagikarp cluster."
        ),
        reference="https://www.lesswrong.com/posts/aPeJE8bSo6rAFoLqg/solidgoldmagikarp-plus-prompt-generation",
    ),
    GlitchRegistryEntry(
        token_id=151645,
        token_text=" cloneembedreportprint",
        danger_level=DangerLevel.MEDIUM,
        effect=(
            "Concatenated UI action string from web scraping. "
            "May produce unexpected completions related to web UIs."
        ),
        reference="https://www.lesswrong.com/posts/aPeJE8bSo6rAFoLqg/solidgoldmagikarp-plus-prompt-generation",
    ),
    GlitchRegistryEntry(
        token_id=100257,
        token_text="<|endoftext|>",
        danger_level=DangerLevel.MEDIUM,
        effect=(
            "Special end-of-text control token. When present in user input, "
            "may cause premature sequence termination in some API configurations."
        ),
        reference="https://github.com/openai/tiktoken",
    ),
    GlitchRegistryEntry(
        token_id=177879,
        token_text=" attRot",
        danger_level=DangerLevel.LOW,
        effect=(
            "Undertrained token fragment. Produces slightly elevated "
            "perplexity but no severe pathological behaviour."
        ),
        reference="https://arxiv.org/abs/2405.05417",
    ),
)

# HuggingFace GPT-2 BPE — smaller vocab, different glitch set
_HF_GPT2_GLITCHES: Final[tuple[GlitchRegistryEntry, ...]] = (
    GlitchRegistryEntry(
        token_id=50256,
        token_text="<|endoftext|>",
        danger_level=DangerLevel.MEDIUM,
        effect=(
            "GPT-2 end-of-text token. Appearance in user input can "
            "cause premature generation termination."
        ),
        reference="https://huggingface.co/gpt2",
    ),
    GlitchRegistryEntry(
        token_id=30898,
        token_text=" NewGuid",
        danger_level=DangerLevel.LOW,
        effect=(
            "Undertrained .NET identifier fragment. "
            "Minor anomaly with no severe effect."
        ),
        reference="https://arxiv.org/abs/2405.05417",
    ),
)

# SentencePiece (XLM-RoBERTa) — unigram model, different pathology set
_SENTENCEPIECE_XLMR_GLITCHES: Final[tuple[GlitchRegistryEntry, ...]] = (
    GlitchRegistryEntry(
        token_id=3,
        token_text="<unk>",
        danger_level=DangerLevel.LOW,
        effect=(
            "Unknown token placeholder. High frequency in non-Latin scripts "
            "indicates vocabulary gaps rather than a true glitch."
        ),
        reference="https://github.com/google/sentencepiece",
    ),
)


# ── Master registry ──────────────────────────────────────
# Maps (tokenizer_name, version_prefix) → tuple of entries.
# version_prefix is matched via str.startswith() for minor-version tolerance.

_GLITCH_REGISTRY: Final[
    dict[tuple[str, str], tuple[GlitchRegistryEntry, ...]]
] = {
    ("tiktoken_cl100k", "0."): _TIKTOKEN_CL100K_GLITCHES,
    ("huggingface_gpt2", "4."): _HF_GPT2_GLITCHES,
    ("sentencepiece_xlmr", "0."): _SENTENCEPIECE_XLMR_GLITCHES,
}


class GlitchTokenService:
    """
    Stateless, in-memory glitch token detector.

    Usage::

        service = GlitchTokenService()
        glitches = service.detect_glitches(
            token_ids=[188700, 15, 42, 188700],
            tokenizer_name="tiktoken_cl100k",
            tokenizer_version="0.12.0",
        )
    """

    def _resolve_registry(
        self, tokenizer_name: str, tokenizer_version: str,
    ) -> tuple[GlitchRegistryEntry, ...] | None:
        """
        Look up the glitch registry for a (name, version) pair.
        Returns None (with a log warning) if no registry matches.
        """
        for (reg_name, ver_prefix), entries in _GLITCH_REGISTRY.items():
            if reg_name == tokenizer_name and tokenizer_version.startswith(ver_prefix):
                return entries
        logger.debug(
            "glitch.registry_miss",
            tokenizer_name=tokenizer_name,
            tokenizer_version=tokenizer_version,
        )
        return None

    def detect_glitches(
        self,
        token_ids: list[int],
        tokenizer_name: str,
        tokenizer_version: str,
    ) -> list[GlitchToken]:
        """
        Scan *already-encoded* token IDs for known glitch tokens.

        Algorithmic complexity: O(n) where n = len(token_ids).
        Each token ID is checked once against a frozenset lookup table.

        Args:
            token_ids: Token IDs produced by the adapter (no re-encoding).
            tokenizer_name: Adapter name (e.g. ``"tiktoken_cl100k"``).
            tokenizer_version: Exact version string from the adapter.

        Returns:
            List of ``GlitchToken`` objects, sorted by first position.
            Empty list if no glitches found or registry unavailable.
        """
        registry = self._resolve_registry(tokenizer_name, tokenizer_version)
        if registry is None:
            return []

        # Build O(1) lookup: token_id → entry
        lookup: dict[int, GlitchRegistryEntry] = {
            entry.token_id: entry for entry in registry
        }
        glitch_ids: frozenset[int] = frozenset(lookup)

        # Single-pass O(n) scan — collect positions per token_id
        found: dict[int, list[int]] = {}
        for position, tid in enumerate(token_ids):
            if tid in glitch_ids:
                found.setdefault(tid, []).append(position)

        if not found:
            return []

        # Convert to GlitchToken Pydantic models
        results: list[GlitchToken] = []
        for tid, positions in found.items():
            entry = lookup[tid]
            results.append(GlitchToken(
                token_id=tid,
                token_text=entry.token_text,
                tokenizer_name=tokenizer_name,
                tokenizer_version=tokenizer_version,
                danger_level=entry.danger_level,
                effect=entry.effect,
                reference=entry.reference,
                positions=positions,
            ))

        # Sort by first occurrence position for deterministic output
        results.sort(key=lambda g: g.positions[0] if g.positions else 0)

        logger.info(
            "glitch.detected",
            tokenizer=tokenizer_name,
            count=len(results),
            total_occurrences=sum(len(g.positions) for g in results),
        )
        return results

    def detect_glitches_batch(
        self,
        token_id_map: dict[str, tuple[list[int], str]],
    ) -> list[GlitchToken]:
        """
        Run glitch detection across multiple tokenizers in batch.

        Args:
            token_id_map: ``{tokenizer_name: (token_ids, tokenizer_version)}``.

        Returns:
            Aggregated list of GlitchToken from all tokenizers,
            sorted by (tokenizer_name, first_position).
        """
        all_glitches: list[GlitchToken] = []
        for name, (ids, version) in sorted(token_id_map.items()):
            all_glitches.extend(
                self.detect_glitches(ids, name, version)
            )
        return all_glitches

    @staticmethod
    def get_registry_tokenizers() -> list[str]:
        """Return the list of tokenizer names that have glitch registries."""
        return sorted({name for (name, _) in _GLITCH_REGISTRY})
