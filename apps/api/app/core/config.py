"""
Application Configuration

Uses Pydantic Settings for type-safe, validated configuration.
All values sourced from environment variables with sensible defaults.

Design decisions:
- pydantic-settings auto-reads from .env file
- All secrets are strings (no auto-coercion surprises)
- CORS_ORIGINS parsed from comma-separated string
- No hardcoded secrets anywhere in codebase
"""

from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ── Application ───────────────────────────────────────
    APP_ENV: str = "development"
    APP_NAME: str = "TokenTax"
    APP_VERSION: str = "0.1.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # ── API ───────────────────────────────────────────────
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000
    API_PREFIX: str = "/api/v1"

    # ── Security ──────────────────────────────────────────
    SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── Database ──────────────────────────────────────────
    DATABASE_URL: str
    POSTGRES_DB: str = "tokentax"
    POSTGRES_USER: str = "tokentax"
    POSTGRES_PASSWORD: str = "tokentax_dev_password"
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432

    # ── Redis ─────────────────────────────────────────────
    REDIS_URL: str
    REDIS_TTL_SECONDS: int = 3600

    # ── CORS ──────────────────────────────────────────────
    CORS_ORIGINS: List[str] = ["http://localhost:3000"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    # ── Worker ────────────────────────────────────────────
    WORKER_CONCURRENCY: int = 4
    BATCH_MAX_SIZE: int = 1000

    # ── Tokenizer ─────────────────────────────────────────
    TOKENIZER_CACHE_TTL: int = 86400
    DEFAULT_TOKENIZER: str = "tiktoken"

    # ── Pricing ───────────────────────────────────────────
    PRICING_SNAPSHOT_DIR: str = "data/pricing_snapshots"

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"


@lru_cache
def get_settings() -> Settings:
    """
    Cached settings singleton.
    lru_cache ensures this is only instantiated once per process.
    """
    return Settings()


# Module-level singleton for convenient import
settings = get_settings()
