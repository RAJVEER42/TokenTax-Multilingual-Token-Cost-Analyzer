"""
FastAPI Dependencies — Authentication & Authorization

Provides reusable Depends() callables for route-level auth:
- get_current_user: extracts + validates JWT from Authorization header
- require_active_user: ensures user is not deactivated
- require_role: factory for role-based access control

Design decisions:
- OAuth2 bearer scheme used for Swagger "Authorize" button support
- Token decode is stateless (no DB hit) — fast for every request
- Profile lookup (DB hit) only when the route actually needs user data
- Deactivated users are rejected even with valid tokens
"""

from typing import Annotated

import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User

logger = structlog.get_logger(__name__)

# Swagger UI "Authorize" button will point to /api/v1/auth/login
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False,  # We handle missing token ourselves
)


async def get_current_user_id(
    token: Annotated[str | None, Depends(oauth2_scheme)],
) -> str:
    """
    Extract and validate the user ID from the Bearer token.
    Stateless — no DB hit. Only decodes + checks expiry.

    Raises:
        HTTPException 401 if token is missing, invalid, or expired.
    """
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user_id


async def get_current_user(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> User:
    """
    Load the full User record from the database.
    Use this when the route needs user data (profile, role check, etc.).

    Raises:
        HTTPException 401 if user not found or deactivated.
    """
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def require_role(*allowed_roles: str):
    """
    Factory: returns a dependency that checks the user's role.

    Usage:
        @router.get("/admin", dependencies=[Depends(require_role("admin"))])
        async def admin_only(): ...
    """
    async def _check_role(
        user: Annotated[User, Depends(get_current_user)],
    ) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {', '.join(allowed_roles)}",
            )
        return user

    return _check_role
