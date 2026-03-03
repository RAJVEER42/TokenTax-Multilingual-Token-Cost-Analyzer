"""
Sentry Error Tracking Integration

Initializes Sentry SDK for automatic exception capture with:
- FastAPI integration (captures unhandled route errors)
- SQLAlchemy integration (monitors DB query performance)
- Environment-aware sampling (100% in staging, 20% in production)
- PII stripping (no user emails/passwords sent to Sentry)

Design decisions:
- Sentry is OPTIONAL — if SENTRY_DSN is not set, no SDK is loaded
- Traces sample rate varies by environment (save cost in high-traffic prod)
- Release tag uses APP_VERSION for deploy tracking in Sentry UI
- Called once at startup from main.py lifespan
"""

import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


def init_sentry() -> None:
    """
    Initialize Sentry SDK if SENTRY_DSN is configured.
    Safe to call even when Sentry is not installed — gracefully no-ops.
    """
    sentry_dsn = getattr(settings, "SENTRY_DSN", None) or ""
    if not sentry_dsn:
        logger.info("sentry.skipped", reason="SENTRY_DSN not configured")
        return

    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration

        traces_sample_rate = 0.2 if settings.is_production else 1.0

        sentry_sdk.init(
            dsn=sentry_dsn,
            environment=settings.APP_ENV,
            release=f"tokentax@{settings.APP_VERSION}",
            traces_sample_rate=traces_sample_rate,
            send_default_pii=False,  # Never send PII
            integrations=[
                FastApiIntegration(transaction_style="endpoint"),
                SqlalchemyIntegration(),
            ],
        )
        logger.info(
            "sentry.initialized",
            environment=settings.APP_ENV,
            traces_sample_rate=traces_sample_rate,
        )
    except ImportError:
        logger.warning(
            "sentry.not_installed",
            detail="pip install sentry-sdk[fastapi] to enable error tracking",
        )
    except Exception as e:
        logger.error("sentry.init_failed", error=str(e))
