"""
Prometheus Metrics Endpoint

GET /metrics — exposes Prometheus-format metrics for scraping.

This endpoint is consumed by:
- Prometheus server (pull-based scraping every 15s)
- Grafana dashboards (via Prometheus data source)
- Alert Manager (threshold-based alerting)

Design decisions:
- Uses prometheus_client's built-in generate_latest() for wire format
- Content-Type is text/plain with version (Prometheus exposition format)
- No authentication required — metrics endpoints are typically internal
  and protected at the network level (firewall / internal LB)
"""

from fastapi import APIRouter
from fastapi.responses import Response
from prometheus_client import (
    CONTENT_TYPE_LATEST,
    generate_latest,
)

router = APIRouter()


@router.get(
    "",
    summary="Prometheus Metrics",
    description="Returns all application metrics in Prometheus exposition format.",
    response_class=Response,
)
async def prometheus_metrics() -> Response:
    """Serve Prometheus metrics for scraping."""
    return Response(
        content=generate_latest(),
        media_type=CONTENT_TYPE_LATEST,
    )
