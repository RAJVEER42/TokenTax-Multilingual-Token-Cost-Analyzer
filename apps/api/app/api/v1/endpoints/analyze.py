"""
Analyze Endpoint

POST /api/v1/analyze — core tokenization + fairness analysis.
Single Responsibility: request validation, service orchestration, response assembly.

Design decisions:
- Route is THIN — no business logic here. It validates input, calls
  services, and assembles the response. This keeps routes testable
  without mocking tokenizer internals.
- Tokenizers must NOT live inside routes because:
  1. Routes should only handle HTTP concerns (validation, serialization).
  2. Tokenizer logic is reusable (CLI, workers, tests call it directly).
  3. Coupling tokenizers to routes makes testing require HTTP fixtures.
- Fairness logic must be decoupled from tokenization because:
  1. They change at different rates (new tokenizers vs new formulas).
  2. Fairness needs cross-tokenizer data that no single adapter has.
  3. Different fairness algorithms may be A/B tested independently.
"""

import structlog
from fastapi import APIRouter, status

from app.core.responses import ORJSONResponse
from app.schemas.analysis import (
    AnalyzeRequest,
    AnalyzeResponse,
    FairnessResult,
    GlitchToken,
)
from app.schemas.tokenizer import ConfidenceLevel
from app.services.cache_service import CacheService
from app.services.fairness_service import FairnessService
from app.services.glitch_token_service import GlitchTokenService
from app.services.tokenizer_service import TokenizerService

logger = structlog.get_logger(__name__)
router = APIRouter()


def _build_warnings(results: list, errors: list) -> list[str]:
    """Generate user-facing warnings from analysis results."""
    warnings: list[str] = []
    for r in results:
        if r.confidence == ConfidenceLevel.ESTIMATED:
            warnings.append(
                f"Tokenizer '{r.tokenizer_name}' provides ESTIMATED counts "
                f"(±15% accuracy). No official tokenizer is available."
            )
    if errors:
        failed_names = [e.tokenizer_name for e in errors]
        warnings.append(
            f"Tokenizer(s) failed: {', '.join(failed_names)}. "
            f"Results are partial."
        )
    return warnings


@router.post(
    "/analyze",
    response_model=AnalyzeResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyze text across tokenizers",
    description=(
        "Tokenizes the input text with all (or selected) tokenizers, "
        "computes fairness scores, and returns deterministic results."
    ),
)
async def analyze_text(request: AnalyzeRequest) -> ORJSONResponse:
    """
    Core analysis endpoint.

    Flow:
    1. Validate request (Pydantic handles this).
    2. Run tokenization across adapters (with cache).
    3. Compute fairness scores.
    4. Assemble response with warnings.
    """
    logger.info(
        "analyze.request",
        language=request.language,
        text_length=len(request.text),
        tokenizers=request.tokenizers,
    )

    cache_service = CacheService()
    tokenizer_service = TokenizerService(cache_service=cache_service)
    fairness_service = FairnessService()
    glitch_service = GlitchTokenService()

    # Step 1: Tokenize across all requested adapters
    results, errors, token_id_map = await tokenizer_service.batch_analyze(
        text=request.text,
        language=request.language,
        tokenizer_names=request.tokenizers,
    )

    # Step 2: Compute English baseline for fairness scoring.
    # If the language IS English, the ratio is trivially 100.
    fairness_results: list[FairnessResult] = []
    if request.language == "en":
        for r in results:
            fairness_results.append(FairnessResult(
                tokenizer_name=r.tokenizer_name,
                fairness_score=100.0,
                token_ratio=100.0,
            ))
    else:
        # Run English baseline tokenization for comparison
        en_results, _, _ = await tokenizer_service.batch_analyze(
            text=request.text,
            language="en",
            tokenizer_names=request.tokenizers,
        )
        fairness_results = fairness_service.compute_fairness_from_results(
            results=results,
            english_results=en_results,
        )

    # Step 3: Detect glitch tokens (reuses already-encoded IDs, no re-encoding)
    glitches: list[GlitchToken] = glitch_service.detect_glitches_batch(
        token_id_map
    )

    # Step 4: Build warnings
    warnings = _build_warnings(results, errors)

    fairness_results.sort(key=lambda f: f.tokenizer_name)

    response = AnalyzeResponse(
        text_length=len(request.text),
        language=request.language,
        results=results,
        fairness=fairness_results,
        glitches=glitches,
        errors=errors,
        warnings=warnings,
    )

    logger.info(
        "analyze.complete",
        result_count=len(results),
        error_count=len(errors),
    )

    return ORJSONResponse(content=response.model_dump())
