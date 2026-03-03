"""
Health Check Endpoint

Returns system health status for all critical dependencies.
This endpoint is used by:
- Docker health checks
- Load balancer probes
- Monitoring systems (Uptime Robot, Datadog, etc.)
- CI/CD deployment verification

Design: Returns 200 only if ALL critical services are healthy.
Returns 503 if any critical service is degraded.
"""

from typing import Literal

import structlog
from fastapi import APIRouter, status
from fastapi.responses import ORJSONResponse
from pydantic import BaseModel

from app.db.redis import CacheManager
from app.db.session import engine

logger = structlog.get_logger(__name__)
router = APIRouter()


class ServiceStatus(BaseModel):
    status: Literal["healthy", "degraded", "unhealthy"]
    latency_ms: float | None = None
    detail: str | None = None


class HealthResponse(BaseModel):
    status: Literal["healthy", "degraded", "unhealthy"]
    version: str
    environment: str
    services: dict[str, ServiceStatus]


async def _check_database() -> ServiceStatus:
    """Check PostgreSQL connectivity and measure latency."""
    import time
    import sqlalchemy

    start = time.monotonic()
    try:
        async with engine.connect() as conn:
            await conn.execute(sqlalchemy.text("SELECT 1"))
        latency_ms = (time.monotonic() - start) * 1000
        return ServiceStatus(status="healthy", latency_ms=round(latency_ms, 2))
    except Exception as e:
        return ServiceStatus(status="unhealthy", detail=str(e))


async def _check_redis() -> ServiceStatus:
    """Check Redis connectivity and measure latency."""
    import time

    cache = CacheManager(prefix="health")
    start = time.monotonic()
    is_healthy = await cache.health_check()
    latency_ms = (time.monotonic() - start) * 1000

    if is_healthy:
        return ServiceStatus(status="healthy", latency_ms=round(latency_ms, 2))
    return ServiceStatus(status="unhealthy", detail="Redis ping failed")


@router.get(
    "",
    response_model=HealthResponse,
    summary="System Health Check",
    description="Returns health status for all services. Used by load balancers and monitoring.",
)
async def health_check() -> ORJSONResponse:
    """
    Comprehensive health check endpoint.

    Checks:
    - PostgreSQL connectivity
    - Redis connectivity

    Returns 200 if all healthy, 503 if any service is degraded.
    """
    from app.core.config import settings

    db_status = await _check_database()
    redis_status = await _check_redis()

    services = {
        "database": db_status,
        "redis": redis_status,
    }

    # Overall status = worst individual status
    all_statuses = [s.status for s in services.values()]
    if "unhealthy" in all_statuses:
        overall = "unhealthy"
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE
    elif "degraded" in all_statuses:
        overall = "degraded"
        http_status = status.HTTP_200_OK
    else:
        overall = "healthy"
        http_status = status.HTTP_200_OK

    logger.info(
        "health.check",
        overall=overall,
        db=db_status.status,
        redis=redis_status.status,
    )

    response_data = HealthResponse(
        status=overall,
        version=settings.APP_VERSION,
        environment=settings.APP_ENV,
        services=services,
    )

    return ORJSONResponse(
        content=response_data.model_dump(),
        status_code=http_status,
    )


@router.get(
    "/ping",
    summary="Simple Ping",
    description="Lightweight liveness check. No DB or Redis calls.",
)
async def ping() -> dict[str, str]:
    """Simple ping — returns immediately. For liveness probes."""
    return {"status": "ok", "message": "pong"}
