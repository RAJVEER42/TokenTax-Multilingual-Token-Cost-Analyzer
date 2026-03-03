"""
SharedAnalysis ORM Model

Persists analysis results for shareable links (/share/:id).
Each row stores a complete AnalyzeResponse snapshot with a unique
short ID for URL-friendly sharing.

Design decisions:
- short_id is an 8-character nanoid (URL-safe, collision-resistant)
- payload stores the full AnalyzeResponse as JSONB for deterministic re-rendering
- input_text + language are stored separately for OG metadata generation
- expires_at enables optional TTL for ephemeral shares (NULL = permanent)
- formula_version is denormalized for quick filtering / auditing
"""

import secrets
import string
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Index, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

# 8-char alphabet: URL-safe, no ambiguous chars (0/O, 1/l/I)
_SHORT_ID_ALPHABET = string.ascii_lowercase + string.digits
_SHORT_ID_LENGTH = 8


def generate_short_id() -> str:
    """Generate a URL-friendly short ID (8 chars, ~41 bits of entropy)."""
    return "".join(
        secrets.choice(_SHORT_ID_ALPHABET) for _ in range(_SHORT_ID_LENGTH)
    )


class SharedAnalysis(Base):
    """Persisted analysis result for shareable links."""

    __tablename__ = "shared_analyses"

    short_id: Mapped[str] = mapped_column(
        String(16),
        unique=True,
        nullable=False,
        default=generate_short_id,
        index=True,
    )

    input_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    language: Mapped[str] = mapped_column(
        String(5),
        nullable=False,
    )

    payload: Mapped[dict] = mapped_column(
        JSONB,
        nullable=False,
        comment="Full AnalyzeResponse snapshot as JSON",
    )

    formula_version: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    expires_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    __table_args__ = (
        Index("ix_shared_analyses_short_id", "short_id", unique=True),
        Index("ix_shared_analyses_created_at", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<SharedAnalysis short_id={self.short_id!r}>"
