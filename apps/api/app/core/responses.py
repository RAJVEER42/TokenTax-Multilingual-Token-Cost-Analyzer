"""
Custom response classes for FastAPI.

FastAPI's bundled ORJSONResponse is deprecated in newer versions.
We define our own to maintain fast orjson serialization without
depending on the deprecated import path.
"""

import orjson
from starlette.responses import JSONResponse


class ORJSONResponse(JSONResponse):
    """High-performance JSON response using orjson."""

    media_type = "application/json"

    def render(self, content: object) -> bytes:
        return orjson.dumps(content)
