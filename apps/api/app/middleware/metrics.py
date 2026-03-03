"""
Prometheus Metrics Middleware

Instruments every HTTP request with:
- http_requests_total      — counter (method, path, status)
- http_request_duration_seconds — histogram (method, path)
- http_requests_in_progress    — gauge (method, path)

The /metrics endpoint is served by prometheus_client's ASGI app.

Design decisions:
- Middleware intercepts ALL requests (no manual per-route decoration)
- Path normalization collapses path params (e.g. /share/abc → /share/{id})
  to prevent high-cardinality metric explosions
- Duration histogram uses standard buckets for web APIs
- Excluding /metrics and /health/ping from instrumentation prevents self-loops
"""

import time
from typing import Callable

from prometheus_client import Counter, Gauge, Histogram
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

# ── Metric Definitions ──────────────────────────────────

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "path", "status"],
)

REQUEST_DURATION = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "path"],
    buckets=(0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)

REQUESTS_IN_PROGRESS = Gauge(
    "http_requests_in_progress",
    "Number of HTTP requests currently being processed",
    ["method", "path"],
)

# ── Path Normalization ──────────────────────────────────

# Paths to exclude from instrumentation (prevent self-loops)
_EXCLUDED_PATHS = frozenset({"/metrics", "/api/v1/health/ping"})


def _normalize_path(path: str) -> str:
    """
    Collapse dynamic path segments to prevent cardinality explosion.

    /api/v1/share/abc123  → /api/v1/share/{id}
    /api/v1/health        → /api/v1/health
    """
    parts = path.rstrip("/").split("/")
    normalized = []
    for i, part in enumerate(parts):
        # Heuristic: segments after known collection names are IDs
        if i > 0 and normalized and normalized[-1] in ("share",):
            normalized.append("{id}")
        else:
            normalized.append(part)
    return "/".join(normalized) or "/"


# ── Middleware ──────────────────────────────────────────

class PrometheusMiddleware(BaseHTTPMiddleware):
    """Starlette middleware that records Prometheus metrics per request."""

    async def dispatch(
        self, request: Request, call_next: Callable
    ) -> Response:
        path = request.url.path

        # Skip excluded paths
        if path in _EXCLUDED_PATHS:
            return await call_next(request)

        method = request.method
        norm_path = _normalize_path(path)

        REQUESTS_IN_PROGRESS.labels(method=method, path=norm_path).inc()
        start = time.perf_counter()

        try:
            response = await call_next(request)
            status_code = response.status_code
        except Exception:
            status_code = 500
            raise
        finally:
            duration = time.perf_counter() - start
            REQUEST_COUNT.labels(
                method=method, path=norm_path, status=str(status_code)
            ).inc()
            REQUEST_DURATION.labels(method=method, path=norm_path).observe(
                duration
            )
            REQUESTS_IN_PROGRESS.labels(method=method, path=norm_path).dec()

        return response
