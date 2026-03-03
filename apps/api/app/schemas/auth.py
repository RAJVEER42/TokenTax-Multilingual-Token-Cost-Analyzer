"""
Authentication Schemas

Pydantic models for auth request/response contracts.

Design decisions:
- Registration requires email + password + optional display name
- Login returns access + refresh tokens (standard JWT pattern)
- Token refresh only requires the refresh token string
- Profile response exposes safe fields only (no hashed_password, ever)
"""

from pydantic import BaseModel, EmailStr, Field


# ── Request Models ──────────────────────────────────────

class RegisterRequest(BaseModel):
    """POST /auth/register request body."""
    email: EmailStr = Field(..., description="Valid email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password (8–128 chars)",
    )
    display_name: str = Field(
        default="Researcher",
        min_length=1,
        max_length=100,
        description="Public display name",
    )


class LoginRequest(BaseModel):
    """POST /auth/login request body."""
    email: EmailStr
    password: str = Field(..., min_length=1)


class RefreshRequest(BaseModel):
    """POST /auth/refresh request body."""
    refresh_token: str = Field(..., min_length=1)


# ── Response Models ─────────────────────────────────────

class TokenResponse(BaseModel):
    """JWT token pair returned on login/register/refresh."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(
        ..., description="Access token lifetime in seconds"
    )


class UserProfileResponse(BaseModel):
    """GET /auth/me response — safe user info (no secrets)."""
    id: str
    email: str
    display_name: str
    role: str
    is_active: bool
    created_at: str


class MessageResponse(BaseModel):
    """Generic success message."""
    message: str
