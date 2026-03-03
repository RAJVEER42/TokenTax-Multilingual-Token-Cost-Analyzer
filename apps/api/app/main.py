"""
TokenTax FastAPI Application Entry Point

This is the root application factory. It:
1. Creates the FastAPI app instance with full OpenAPI metadata
2. Registers all middleware (CORS, logging, timing)
3. Registers all routers
4. Registers startup/shutdown lifecycle hooks
5. Wires up structured logging

Design decision: We use lifespan context manager (FastAPI 0.95+)
instead of deprecated @app.on_event decorators for cleaner async
resource management.
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.logging import configure_logging
from app.db.session import engine
from app.db.redis import get_redis_client

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """
    Application lifespan manager.
    Handles startup and shutdown of all resources.
    """
    # ── Startup ─────────────────────────────────────────
    configure_logging()
    logger.info("tokentax.startup", version=settings.APP_VERSION, env=settings.APP_ENV)

    # Verify DB connectivity
    try:
        async with engine.connect() as conn:
            await conn.execute(__import__("sqlalchemy").text("SELECT 1"))
        logger.info("tokentax.db.connected")
    except Exception as e:
        logger.error("tokentax.db.connection_failed", error=str(e))
        raise

    # Verify Redis connectivity
    try:
        redis = await get_redis_client()
        await redis.ping()
        logger.info("tokentax.redis.connected")
    except Exception as e:
        logger.error("tokentax.redis.connection_failed", error=str(e))
        raise

    yield  # ← Application runs here

    # ── Shutdown ─────────────────────────────────────────
    logger.info("tokentax.shutdown")
    await engine.dispose()


def create_application() -> FastAPI:
    """
    Application factory pattern.
    Returns a fully configured FastAPI instance.
    """
    app = FastAPI(
        title="TokenTax API",
        description=(
            "Multilingual Token Cost Analyzer — measures token inequality, "
            "BPE bias, and economic API cost disparities across languages."
        ),
        version=settings.APP_VERSION,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        default_response_class=ORJSONResponse,  # Faster JSON serialization
        lifespan=lifespan,
    )

    # ── CORS Middleware ───────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ───────────────────────────────────────────
    app.include_router(api_router, prefix=settings.API_PREFIX)

    return app


app = create_application()
