"""
V1 API Router — aggregates all endpoint routers.

Each feature domain gets its own router module.
This file only wires them together — no business logic here.
"""

from fastapi import APIRouter

from app.api.v1.endpoints import analyze, health, metadata

api_router = APIRouter()

# ── Health ────────────────────────────────────────────────
api_router.include_router(
    health.router,
    prefix="/health",
    tags=["Health"],
)

# ── Analysis ──────────────────────────────────────────────
api_router.include_router(
    analyze.router,
    tags=["Analysis"],
)

# ── Metadata ──────────────────────────────────────────────
api_router.include_router(
    metadata.router,
    tags=["Metadata"],
)

# ── Future routers (added as phases progress) ─────────────
# api_router.include_router(analysis.router, prefix="/analysis", tags=["Analysis"])
# api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
# api_router.include_router(pricing.router, prefix="/pricing", tags=["Pricing"])
# api_router.include_router(batch.router, prefix="/batch", tags=["Batch"])
