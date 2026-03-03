"""
Authentication Service

Encapsulates all auth business logic:
- Registration (create user, hash password, issue tokens)
- Login (verify credentials, issue tokens)
- Token refresh (validate refresh token, issue new pair)
- Profile retrieval

Design decisions:
- Service layer owns the logic; routes are thin HTTP wrappers
- Passwords are hashed with bcrypt (via security.py)
- JWTs are signed HS256 (via security.py)
- All DB interactions use async SQLAlchemy sessions
- Errors are raised as HTTPExceptions for uniform API responses
"""


import structlog
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.schemas.auth import TokenResponse, UserProfileResponse

logger = structlog.get_logger(__name__)


class AuthService:
    """Stateless auth operations — receives session per call."""

    @staticmethod
    async def register(
        db: AsyncSession,
        email: str,
        password: str,
        display_name: str = "Researcher",
    ) -> TokenResponse:
        """
        Register a new user account.

        Raises:
            HTTPException 409 if email already exists.
        """
        # Check for existing user
        result = await db.execute(
            select(User).where(User.email == email.lower())
        )
        existing = result.scalar_one_or_none()
        if existing is not None:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="An account with this email already exists.",
            )

        # Create user
        user = User(
            email=email.lower(),
            hashed_password=hash_password(password),
            display_name=display_name,
            role="free",
            is_active=True,
        )
        db.add(user)
        await db.flush()  # get user.id before commit

        logger.info("auth.register", user_id=str(user.id), email=email.lower())

        # Issue tokens
        return _build_token_response(str(user.id))

    @staticmethod
    async def login(
        db: AsyncSession,
        email: str,
        password: str,
    ) -> TokenResponse:
        """
        Authenticate with email + password.

        Raises:
            HTTPException 401 on invalid credentials.
            HTTPException 403 if account is deactivated.
        """
        result = await db.execute(
            select(User).where(User.email == email.lower())
        )
        user = result.scalar_one_or_none()

        if user is None or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password.",
            )

        if not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Account is deactivated. Contact support.",
            )

        logger.info("auth.login", user_id=str(user.id))
        return _build_token_response(str(user.id))

    @staticmethod
    async def refresh(
        db: AsyncSession,
        refresh_token: str,
    ) -> TokenResponse:
        """
        Exchange a valid refresh token for a new access + refresh pair.

        Raises:
            HTTPException 401 if refresh token is invalid/expired.
        """
        try:
            payload = decode_token(refresh_token)
        except Exception:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token.",
            )

        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token is not a refresh token.",
            )

        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload.",
            )

        # Verify user still exists and is active
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if user is None or not user.is_active:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found or deactivated.",
            )

        logger.info("auth.refresh", user_id=user_id)
        return _build_token_response(user_id)

    @staticmethod
    async def get_profile(
        db: AsyncSession,
        user_id: str,
    ) -> UserProfileResponse:
        """
        Retrieve user profile by ID.

        Raises:
            HTTPException 404 if user not found.
        """
        result = await db.execute(
            select(User).where(User.id == user_id)
        )
        user = result.scalar_one_or_none()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )

        return UserProfileResponse(
            id=str(user.id),
            email=user.email,
            display_name=user.display_name,
            role=user.role,
            is_active=user.is_active,
            created_at=user.created_at.isoformat(),
        )


def _build_token_response(user_id: str) -> TokenResponse:
    """Build a JWT token pair for the given user ID."""
    access = create_access_token(subject=user_id)
    refresh = create_refresh_token(subject=user_id)
    return TokenResponse(
        access_token=access,
        refresh_token=refresh,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )
