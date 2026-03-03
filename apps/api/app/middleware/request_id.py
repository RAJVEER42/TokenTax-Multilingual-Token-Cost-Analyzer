"""
Request ID Middleware

Assigns a unique request ID to every incoming HTTP request.
The ID is:
1. Injected into structlog context (appears in all log lines)
2. Set as X-Request-ID response header (correlates client ↔ server logs)
3. Accepted from the client if already present (for distributed tracing)

Design decisions:
- UUID4 is used when no client ID is provided (collision-resistant)
- structlog contextvars ensure the ID propagates through async tasks
- X-Request-ID is the de-facto standard header (used by Nginx, AWS ALB, etc.)
"""

import uuid

import structlog
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

REQUEST_ID_HEADER = "X-Request-ID"


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Assigns a unique ID to each request for end-to-end tracing."""

    async def dispatch(self, request: Request, call_next) -> Response:
        # Accept client-provided ID or generate a new one
        request_id = request.headers.get(REQUEST_ID_HEADER) or str(uuid.uuid4())

        # Inject into structlog context — all subsequent log lines include it
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(request_id=request_id)

        response = await call_next(request)

        # Echo the ID back so the client can correlate
        response.headers[REQUEST_ID_HEADER] = request_id

        return response
