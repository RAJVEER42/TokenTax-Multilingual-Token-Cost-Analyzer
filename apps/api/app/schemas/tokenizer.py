"""
Tokenizer Schemas

Pydantic models for tokenizer metadata and individual token analysis results.
Single Responsibility: define the data contracts for tokenization outputs.

Design decisions:
- Confidence is an enum (EXACT vs ESTIMATED) so downstream code can branch
  deterministically rather than parsing free-form strings.
- TokenAnalysis is frozen/immutable once created — tokenization results must
  never be mutated after computation.
- TokenizerInfo carries version + confidence for registry / metadata endpoints.
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field

from app.core.constants import FLOAT_PRECISION


class ConfidenceLevel(str, Enum):
    """
    Whether the token count is an exact computation or an estimate.
    EXACT  — tokenizer ran natively (e.g. tiktoken for GPT).
    ESTIMATED — tokenizer is approximated (e.g. Claude via heuristic).
    """
    EXACT = "EXACT"
    ESTIMATED = "ESTIMATED"


class TokenizerInfo(BaseModel):
    """Static metadata about a single tokenizer adapter."""
    name: str = Field(..., description="Unique tokenizer identifier")
    display_name: str = Field(..., description="Human-readable name")
    version: str = Field(..., description="Pinned library / model version")
    confidence: ConfidenceLevel = Field(
        ..., description="Whether counts are exact or estimated"
    )
    description: str = Field(default="", description="Short description")

    model_config = {"frozen": True}


class TokenAnalysis(BaseModel):
    """
    Result of tokenizing a single text with a single tokenizer.

    Immutable after creation — tokenization results are deterministic
    artifacts and must not be mutated.
    """
    tokenizer_name: str = Field(..., description="Which tokenizer produced this")
    tokenizer_version: str = Field(..., description="Exact version used")
    token_count: int = Field(..., ge=0, description="Number of tokens")
    char_count: int = Field(..., ge=0, description="Number of characters")
    efficiency_ratio: float = Field(
        ...,
        description="tokens / chars — lower is more efficient",
    )
    confidence: ConfidenceLevel = Field(
        ..., description="EXACT or ESTIMATED"
    )
    language: str = Field(..., description="ISO 639-1 language code")
    error: Optional[str] = Field(
        default=None, description="Error message if tokenization failed"
    )

    model_config = {"frozen": True}

    @staticmethod
    def compute_efficiency(token_count: int, char_count: int) -> float:
        """
        Compute tokens-per-character ratio with safe division.
        Rounded to FLOAT_PRECISION decimal places for determinism.
        """
        if char_count == 0:
            return 0.0
        return round(token_count / char_count, FLOAT_PRECISION)
