"""
Share Endpoints — Create and retrieve shareable analysis links.

POST /api/v1/share     — Persist analysis, return short ID.
GET  /api/v1/share/:id — Retrieve persisted analysis by short ID.

Design decisions:
- Short IDs are 8-char alphanumeric strings (URL-safe, ~41 bits entropy).
- Payload is stored as JSONB for deterministic re-rendering.
- No authentication required — share links are public by design.
- Expired shares return 410 Gone (not 404) for clear semantics.
"""

from datetime import datetime, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.responses import ORJSONResponse
from app.db.session import get_db
from app.models.shared_analysis import SharedAnalysis
from app.schemas.share import (
    ShareCreateRequest,
    ShareCreateResponse,
    ShareRetrieveResponse,
)

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.post(
    "/share",
    response_model=ShareCreateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a shareable analysis link",
)
async def create_share(
    request: ShareCreateRequest,
    db: AsyncSession = Depends(get_db),
) -> ORJSONResponse:
    """Persist an analysis result and return a shareable short ID."""
    shared = SharedAnalysis(
        input_text=request.input_text,
        language=request.language,
        payload=request.payload.model_dump(),
        formula_version=request.payload.formula_version,
    )
    db.add(shared)
    await db.flush()

    logger.info(
        "share.created",
        short_id=shared.short_id,
        language=request.language,
        text_length=len(request.input_text),
    )

    response = ShareCreateResponse(
        short_id=shared.short_id,
        share_url=f"/share/{shared.short_id}",
        created_at=shared.created_at,
    )
    return ORJSONResponse(
        content=response.model_dump(mode="json"),
        status_code=status.HTTP_201_CREATED,
    )


@router.get(
    "/share/{short_id}",
    response_model=ShareRetrieveResponse,
    summary="Retrieve a shared analysis by short ID",
)
async def get_share(
    short_id: str,
    db: AsyncSession = Depends(get_db),
) -> ORJSONResponse:
    """Look up a shared analysis by its short ID."""
    stmt = select(SharedAnalysis).where(
        SharedAnalysis.short_id == short_id,
        SharedAnalysis.deleted_at.is_(None),
    )
    result = await db.execute(stmt)
    shared = result.scalar_one_or_none()

    if shared is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shared analysis '{short_id}' not found.",
        )

    # Check expiration
    if shared.expires_at is not None:
        now = datetime.now(timezone.utc)
        if now > shared.expires_at:
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail=f"Shared analysis '{short_id}' has expired.",
            )

    response = ShareRetrieveResponse(
        short_id=shared.short_id,
        input_text=shared.input_text,
        language=shared.language,
        payload=shared.payload,
        formula_version=shared.formula_version,
        created_at=shared.created_at,
        expires_at=shared.expires_at,
    )

    return ORJSONResponse(content=response.model_dump(mode="json"))
