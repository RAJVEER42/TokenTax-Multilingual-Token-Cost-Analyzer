"""
User ORM Model

Stores registered users with bcrypt-hashed passwords and role-based access.

Design decisions:
- Email is the unique identifier (not username) — standard SaaS pattern
- Password stored as bcrypt hash — deliberately slow to prevent brute force
- is_active flag allows account suspension without deletion (GDPR-friendly)
- role field supports future RBAC (admin, researcher, free, pro)
- Inherits UUID PK + timestamps + soft-delete from Base
"""

from sqlalchemy import Boolean, Index, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    """Registered user account."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    display_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        default="Researcher",
    )

    role: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="free",
    )

    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=True,
    )

    # ── Indexes ───────────────────────────────────────────
    __table_args__ = (
        Index("ix_users_email_active", "email", "is_active"),
    )

    def __repr__(self) -> str:
        return f"<User email={self.email} role={self.role} active={self.is_active}>"
