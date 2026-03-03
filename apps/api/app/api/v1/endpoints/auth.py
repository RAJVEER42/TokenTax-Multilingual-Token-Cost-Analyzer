"""
Authentication Endpoints

POST /auth/register — Create a new account
POST /auth/login    — Authenticate and receive JWT tokens
POST /auth/refresh  — Refresh an expired access token
GET  /auth/me       — Get authenticated user's profile

Design decisions:
- Routes are THIN — validate input, call AuthService, return response
- All auth endpoints are public except /auth/me (requires Bearer token)
- Standard HTTP status codes: 201 (created), 200 (success), 401/409 (errors)
"""

from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user_id
from app.db.session import get_db
from app.schemas.auth import (
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserProfileResponse,
)
from app.services.auth_service import AuthService

logger = structlog.get_logger(__name__)
router = APIRouter()


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new account",
)
async def register(
    body: RegisterRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Create a new user account and return JWT tokens."""
    return await AuthService.register(
        db=db,
        email=body.email,
        password=body.password,
        display_name=body.display_name,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate with email & password",
)
async def login(
    body: LoginRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Verify credentials and return JWT tokens."""
    return await AuthService.login(
        db=db,
        email=body.email,
        password=body.password,
    )


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Refresh access token",
)
async def refresh(
    body: RefreshRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> TokenResponse:
    """Exchange a valid refresh token for a new token pair."""
    return await AuthService.refresh(
        db=db,
        refresh_token=body.refresh_token,
    )


@router.get(
    "/me",
    response_model=UserProfileResponse,
    summary="Get current user profile",
)
async def get_me(
    user_id: Annotated[str, Depends(get_current_user_id)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserProfileResponse:
    """Return the authenticated user's profile."""
    return await AuthService.get_profile(db=db, user_id=user_id)
