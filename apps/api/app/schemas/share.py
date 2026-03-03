"""
Share Schemas — Request / Response contracts for the /share endpoints.

Single Responsibility: define Pydantic models for share link creation
and retrieval. Decoupled from the ORM model (SharedAnalysis).
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from app.schemas.analysis import AnalyzeResponse


class ShareCreateRequest(BaseModel):
    """POST /api/v1/share — persist an analysis for sharing."""

    input_text: str = Field(
        ...,
        min_length=1,
        max_length=50_000,
        description="Original input text",
    )
    language: str = Field(
        ...,
        min_length=2,
        max_length=5,
        description="ISO 639-1 language code",
    )
    payload: AnalyzeResponse = Field(
        ...,
        description="Complete analysis response to persist",
    )


class ShareCreateResponse(BaseModel):
    """Response after creating a shareable link."""

    short_id: str = Field(..., description="URL-friendly short ID")
    share_url: str = Field(..., description="Full shareable URL path")
    created_at: datetime


class ShareRetrieveResponse(BaseModel):
    """GET /api/v1/share/:id — retrieve a shared analysis."""

    short_id: str
    input_text: str
    language: str
    payload: AnalyzeResponse
    formula_version: str
    created_at: datetime
    expires_at: Optional[datetime] = None
