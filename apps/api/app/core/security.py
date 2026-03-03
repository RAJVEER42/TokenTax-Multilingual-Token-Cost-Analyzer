"""
Security utilities — JWT token creation and verification.

Industry standard approach:
- HS256 JWT for access tokens (fast, symmetric)
- RS256 can be swapped in for distributed verification (future phase)
- bcrypt for password hashing (deliberately slow — prevents brute force)
- Token blacklisting via Redis (implemented Phase 5)

These utilities are PURE FUNCTIONS — no side effects, no DB calls.
That keeps them testable and framework-independent.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# bcrypt context — auto-handles salt generation
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain-text password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    subject: str | Any,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """
    Create a signed JWT access token.

    Args:
        subject: The token subject (typically user ID as string)
        expires_delta: Custom expiry. Defaults to settings value.

    Returns:
        Signed JWT string
    """
    expire = datetime.now(timezone.utc) + (
        expires_delta
        or timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str | Any) -> str:
    """Create a signed JWT refresh token with longer expiry."""
    expire = datetime.now(timezone.utc) + timedelta(
        days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS
    )
    payload = {
        "sub": str(subject),
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT token.

    Raises:
        JWTError: If token is invalid, expired, or tampered.
    """
    return jwt.decode(
        token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM]
    )
