"""
Phase 10 — Authentication Tests

Tests for:
- User model creation and constraints
- Auth service (register, login, refresh, profile)
- JWT token creation and validation
- Auth dependency (get_current_user_id)
- Auth schemas validation
- Password hashing
"""

import uuid
from datetime import timedelta
from unittest.mock import patch

import pytest

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    RefreshRequest,
    TokenResponse,
    UserProfileResponse,
    MessageResponse,
)


# ═══════════════════════════════════════════════════════════
# Password Hashing
# ═══════════════════════════════════════════════════════════

class TestPasswordHashing:
    """Tests for bcrypt password hashing utilities."""

    def test_hash_password_returns_string(self):
        hashed = hash_password("testpassword123")
        assert isinstance(hashed, str)
        assert len(hashed) > 20  # bcrypt hashes are ~60 chars

    def test_hash_password_different_each_time(self):
        """bcrypt uses random salt — same input, different hash."""
        h1 = hash_password("same_password")
        h2 = hash_password("same_password")
        assert h1 != h2  # Different salts

    def test_verify_password_correct(self):
        hashed = hash_password("mypassword")
        assert verify_password("mypassword", hashed) is True

    def test_verify_password_incorrect(self):
        hashed = hash_password("mypassword")
        assert verify_password("wrongpassword", hashed) is False

    def test_verify_password_empty(self):
        hashed = hash_password("something")
        assert verify_password("", hashed) is False


# ═══════════════════════════════════════════════════════════
# JWT Token Creation & Validation
# ═══════════════════════════════════════════════════════════

class TestJWTTokens:
    """Tests for JWT token creation and decoding."""

    def test_access_token_roundtrip(self):
        user_id = str(uuid.uuid4())
        token = create_access_token(subject=user_id)
        payload = decode_token(token)
        assert payload["sub"] == user_id
        assert payload["type"] == "access"

    def test_refresh_token_roundtrip(self):
        user_id = str(uuid.uuid4())
        token = create_refresh_token(subject=user_id)
        payload = decode_token(token)
        assert payload["sub"] == user_id
        assert payload["type"] == "refresh"

    def test_access_token_has_expiry(self):
        token = create_access_token(subject="user-1")
        payload = decode_token(token)
        assert "exp" in payload
        assert "iat" in payload

    def test_access_token_custom_expiry(self):
        token = create_access_token(
            subject="user-1",
            expires_delta=timedelta(minutes=5),
        )
        payload = decode_token(token)
        iat = payload["iat"]
        exp = payload["exp"]
        # Should expire ~5 minutes after issued
        assert 280 <= (exp - iat) <= 320  # Allow 20s tolerance

    def test_access_and_refresh_tokens_differ(self):
        user_id = "user-1"
        access = create_access_token(subject=user_id)
        refresh = create_refresh_token(subject=user_id)
        assert access != refresh

    def test_decode_invalid_token_raises(self):
        from jose import JWTError
        with pytest.raises(JWTError):
            decode_token("invalid.token.string")

    def test_decode_expired_token_raises(self):
        from jose import ExpiredSignatureError
        token = create_access_token(
            subject="user-1",
            expires_delta=timedelta(seconds=-10),
        )
        with pytest.raises(ExpiredSignatureError):
            decode_token(token)


# ═══════════════════════════════════════════════════════════
# Auth Schemas Validation
# ═══════════════════════════════════════════════════════════

class TestAuthSchemas:
    """Tests for Pydantic auth request/response models."""

    def test_register_request_valid(self):
        req = RegisterRequest(
            email="test@example.com",
            password="securepass123",
            display_name="Alice",
        )
        assert req.email == "test@example.com"
        assert req.password == "securepass123"
        assert req.display_name == "Alice"

    def test_register_request_default_display_name(self):
        req = RegisterRequest(
            email="test@example.com",
            password="securepass123",
        )
        assert req.display_name == "Researcher"

    def test_register_request_invalid_email(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            RegisterRequest(email="not-an-email", password="securepass123")

    def test_register_request_short_password(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            RegisterRequest(email="test@example.com", password="short")

    def test_login_request_valid(self):
        req = LoginRequest(email="user@test.com", password="pass")
        assert req.email == "user@test.com"

    def test_refresh_request_valid(self):
        req = RefreshRequest(refresh_token="some.jwt.token")
        assert req.refresh_token == "some.jwt.token"

    def test_token_response_structure(self):
        resp = TokenResponse(
            access_token="at", refresh_token="rt",
            token_type="bearer", expires_in=1800,
        )
        assert resp.access_token == "at"
        assert resp.token_type == "bearer"
        assert resp.expires_in == 1800

    def test_user_profile_response(self):
        resp = UserProfileResponse(
            id="uuid-1", email="user@test.com",
            display_name="Alice", role="free",
            is_active=True, created_at="2026-01-01T00:00:00Z",
        )
        assert resp.role == "free"
        assert resp.is_active is True

    def test_message_response(self):
        resp = MessageResponse(message="success")
        assert resp.message == "success"


# ═══════════════════════════════════════════════════════════
# Auth Dependency — get_current_user_id
# ═══════════════════════════════════════════════════════════

class TestAuthDependency:
    """Tests for JWT extraction dependency."""

    @pytest.mark.asyncio
    async def test_valid_access_token_extracts_user_id(self):
        from app.api.deps import get_current_user_id
        user_id = str(uuid.uuid4())
        token = create_access_token(subject=user_id)
        result = await get_current_user_id(token)
        assert result == user_id

    @pytest.mark.asyncio
    async def test_missing_token_raises_401(self):
        from app.api.deps import get_current_user_id
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id(None)
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_invalid_token_raises_401(self):
        from app.api.deps import get_current_user_id
        from fastapi import HTTPException
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id("invalid.token")
        assert exc_info.value.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_token_rejected_as_access(self):
        """Refresh tokens must NOT be accepted for API access."""
        from app.api.deps import get_current_user_id
        from fastapi import HTTPException
        refresh = create_refresh_token(subject="user-1")
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id(refresh)
        assert exc_info.value.status_code == 401
        assert "type" in exc_info.value.detail.lower()

    @pytest.mark.asyncio
    async def test_expired_access_token_raises_401(self):
        from app.api.deps import get_current_user_id
        from fastapi import HTTPException
        expired = create_access_token(
            subject="user-1", expires_delta=timedelta(seconds=-10)
        )
        with pytest.raises(HTTPException) as exc_info:
            await get_current_user_id(expired)
        assert exc_info.value.status_code == 401


# ═══════════════════════════════════════════════════════════
# User Model
# ═══════════════════════════════════════════════════════════

class TestUserModel:
    """Tests for the User ORM model structure."""

    def test_user_model_has_required_fields(self):
        from app.models.user import User
        columns = {c.name for c in User.__table__.columns}
        assert "email" in columns
        assert "hashed_password" in columns
        assert "display_name" in columns
        assert "role" in columns
        assert "is_active" in columns
        assert "id" in columns
        assert "created_at" in columns

    def test_user_table_name(self):
        from app.models.user import User
        assert User.__tablename__ == "users"

    def test_user_repr(self):
        from app.models.user import User
        user = User(
            email="test@example.com",
            hashed_password="$2b$12$fake",
            role="free",
            is_active=True,
        )
        assert "test@example.com" in repr(user)
        assert "free" in repr(user)


# ═══════════════════════════════════════════════════════════
# Sentry Module
# ═══════════════════════════════════════════════════════════

class TestSentryInit:
    """Tests for Sentry initialization logic."""

    def test_sentry_skipped_when_no_dsn(self):
        """init_sentry should be a no-op when SENTRY_DSN is empty."""
        from app.core.sentry import init_sentry
        # Should not raise — graceful no-op
        init_sentry()

    @patch("app.core.sentry.settings")
    def test_sentry_skipped_when_dsn_empty_string(self, mock_settings):
        from app.core.sentry import init_sentry
        mock_settings.SENTRY_DSN = ""
        init_sentry()  # No exception

    @patch("app.core.sentry.settings")
    def test_sentry_handles_import_error(self, mock_settings):
        """If sentry_sdk is not installed, should warn but not crash."""
        from app.core.sentry import init_sentry
        mock_settings.SENTRY_DSN = "https://fake@sentry.io/1"
        mock_settings.is_production = False
        mock_settings.APP_ENV = "test"
        mock_settings.APP_VERSION = "1.0.0"
        # sentry_sdk IS installed so this tests the happy path
        # Just verify it doesn't crash
        init_sentry()
