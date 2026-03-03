"""
Metadata Endpoints

GET /api/v1/languages — supported languages list.
GET /api/v1/tokenizers — available tokenizer metadata.

Single Responsibility: serve static/semi-static metadata.
These routes are intentionally trivial — they read from constants
and the adapter registry, nothing more.
"""

from fastapi import APIRouter, status

from app.core.constants import SUPPORTED_LANGUAGES
from app.schemas.analysis import (
    LanguageInfo,
    LanguagesResponse,
    TokenizersResponse,
)
from app.services.tokenizers import get_all_adapters

router = APIRouter()


@router.get(
    "/languages",
    response_model=LanguagesResponse,
    status_code=status.HTTP_200_OK,
    summary="List supported languages",
)
async def list_languages() -> LanguagesResponse:
    """Return all languages supported by the analysis engine."""
    languages = [
        LanguageInfo(code=code, name=name)
        for code, name in sorted(SUPPORTED_LANGUAGES.items())
    ]
    return LanguagesResponse(languages=languages, count=len(languages))


@router.get(
    "/tokenizers",
    response_model=TokenizersResponse,
    status_code=status.HTTP_200_OK,
    summary="List available tokenizers",
    description=(
        "Returns metadata for every registered tokenizer adapter, "
        "including version, confidence level, and description."
    ),
)
async def list_tokenizers() -> TokenizersResponse:
    """Return metadata for all registered tokenizer adapters."""
    adapters = get_all_adapters()
    tokenizer_list = [
        {
            "name": a.name,
            "display_name": a.display_name,
            "version": a.version,
            "confidence": a.confidence.value,
            "description": a.description,
        }
        for a in sorted(adapters, key=lambda a: a.name)
    ]
    return TokenizersResponse(
        tokenizers=tokenizer_list, count=len(tokenizer_list)
    )
