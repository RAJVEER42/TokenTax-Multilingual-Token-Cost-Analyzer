"""
Structured Logging Configuration

Uses structlog for JSON-structured logs in production,
pretty-printed in development.

Design decisions:
- structlog over standard logging for structured context
- JSON output in production for log aggregation (Datadog, CloudWatch, etc.)
- Console output in development for readability
- Request IDs injected via middleware (future phase)
"""

import logging
import sys

import structlog

from app.core.config import settings


def configure_logging() -> None:
    """
    Configure structlog with appropriate processors for the environment.
    Call once at application startup.
    """
    shared_processors = [
        structlog.contextvars.merge_contextvars,
        structlog.stdlib.add_log_level,
        structlog.stdlib.add_logger_name,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.stdlib.PositionalArgumentsFormatter(),
        structlog.processors.StackInfoRenderer(),
    ]

    if settings.is_production:
        # JSON logs for production log aggregation
        processors = shared_processors + [
            structlog.processors.dict_tracebacks,
            structlog.processors.JSONRenderer(),
        ]
    else:
        # Human-readable logs for development
        processors = shared_processors + [
            structlog.dev.ConsoleRenderer(colors=True),
        ]

    structlog.configure(
        processors=processors,
        wrapper_class=structlog.make_filtering_bound_logger(
            getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)
        ),
        context_class=dict,
        logger_factory=structlog.PrintLoggerFactory(sys.stdout),
        cache_logger_on_first_use=True,
    )

    # Also configure stdlib logging to route through structlog
    logging.basicConfig(
        format="%(message)s",
        stream=sys.stdout,
        level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    )
