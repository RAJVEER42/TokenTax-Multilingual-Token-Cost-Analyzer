"""
Database Models — All ORM models imported here for Alembic autogenerate.

Alembic's env.py imports this module so it can detect all model
metadata. Every new model file MUST be imported here.
"""

from app.db.base import Base  # noqa: F401 — Base must be imported first

# Models are imported here as they are created
from app.models.shared_analysis import SharedAnalysis  # noqa: F401 — Phase 8
# from app.models.user import User  # Phase 5
# from app.models.pricing_snapshot import PricingSnapshot  # Phase 2

__all__ = ["Base", "SharedAnalysis"]
