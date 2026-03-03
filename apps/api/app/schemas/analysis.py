"""
Analysis Schemas

Pydantic models for the /analyze request and response contracts.
Single Responsibility: define API-layer data shapes for analysis endpoints.

Design decisions:
- AnalyzeRequest validates and normalizes input before any service call.
- AnalyzeResponse aggregates per-tokenizer results + fairness scores.
- FairnessResult is a standalone model so fairness math can evolve
  independently of tokenization output shapes.
- All responses embed formula_version for reproducibility auditing.
"""

from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.core.constants import (
    FLOAT_PRECISION,
    FORMULA_VERSION,
    SUPPORTED_LANGUAGES,
)
from app.schemas.tokenizer import TokenAnalysis


class AnalyzeRequest(BaseModel):
    """Inbound payload for POST /api/v1/analyze."""
    text: str = Field(
        ...,
        min_length=1,
        max_length=50_000,
        description="Text to tokenize (1–50 000 chars)",
    )
    language: str = Field(
        ...,
        min_length=2,
        max_length=5,
        description="ISO 639-1 language code",
    )
    tokenizers: Optional[list[str]] = Field(
        default=None,
        description="Specific tokenizers to use; null = all available",
    )

    @field_validator("language")
    @classmethod
    def validate_language(cls, v: str) -> str:
        code = v.strip().lower()
        if code not in SUPPORTED_LANGUAGES:
            supported = ", ".join(sorted(SUPPORTED_LANGUAGES.keys()))
            raise ValueError(
                f"Unsupported language '{code}'. Supported: {supported}"
            )
        return code


class FairnessResult(BaseModel):
    """Fairness score for a single tokenizer."""
    tokenizer_name: str
    fairness_score: float = Field(
        ...,
        ge=0.0,
        le=100.0,
        description="0 = extremely biased, 100 = perfectly equitable",
    )
    token_ratio: float = Field(
        ...,
        description="(tokens_lang / tokens_en) * 100; English = 100",
    )
    formula_version: str = FORMULA_VERSION

    model_config = {"frozen": True}


class TokenizerError(BaseModel):
    """Structured error for a single tokenizer that failed."""
    tokenizer_name: str
    error: str


class AnalyzeResponse(BaseModel):
    """Outbound payload for POST /api/v1/analyze."""
    text_length: int = Field(..., description="Character count of input text")
    language: str
    results: list[TokenAnalysis] = Field(
        default_factory=list,
        description="Per-tokenizer analysis results (deterministic order)",
    )
    fairness: list[FairnessResult] = Field(
        default_factory=list,
        description="Per-tokenizer fairness scores",
    )
    errors: list[TokenizerError] = Field(
        default_factory=list,
        description="Tokenizers that failed gracefully",
    )
    warnings: list[str] = Field(
        default_factory=list,
        description="Non-fatal warnings (e.g. estimated confidence)",
    )
    formula_version: str = FORMULA_VERSION
    cached: bool = Field(
        default=False, description="Whether result was served from cache"
    )


class LanguageInfo(BaseModel):
    """Metadata for a single supported language."""
    code: str
    name: str


class LanguagesResponse(BaseModel):
    """Outbound payload for GET /api/v1/languages."""
    languages: list[LanguageInfo]
    count: int


class TokenizersResponse(BaseModel):
    """Outbound payload for GET /api/v1/tokenizers."""
    tokenizers: list[dict]
    count: int
