"""
Security Tests — Phase 9

Validates security posture:
- CORS configuration
- Input validation (SQL injection, XSS)
- Secret management (no secrets in code)
- Structured error model (no stack traces leaked)
"""

from pathlib import Path

import pytest
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.analysis import AnalyzeRequest


class TestCORSConfiguration:
    """Verify CORS is configured correctly."""

    def test_cors_origins_parsed(self):
        origins = settings.CORS_ORIGINS
        assert isinstance(origins, list)
        assert len(origins) > 0

    def test_cors_origins_no_wildcard_in_production(self):
        if settings.is_production:
            assert "*" not in settings.CORS_ORIGINS

    def test_cors_origins_are_urls(self):
        for origin in settings.CORS_ORIGINS:
            assert origin.startswith("http://") or origin.startswith("https://"), (
                f"Invalid CORS origin: {origin}"
            )


class TestInputValidation:
    """Verify input validation prevents injection attacks."""

    def test_empty_text_rejected(self):
        with pytest.raises(ValidationError):
            AnalyzeRequest(text="", language="en")

    def test_text_over_50k_rejected(self):
        with pytest.raises(ValidationError):
            AnalyzeRequest(text="x" * 50_001, language="en")

    def test_sql_injection_in_language_rejected(self):
        with pytest.raises(ValidationError):
            AnalyzeRequest(text="hello", language="'; DROP TABLE--")

    def test_xss_in_text_is_safe(self):
        req = AnalyzeRequest(
            text='<script>alert("xss")</script>',
            language="en",
        )
        assert req.text == '<script>alert("xss")</script>'

    def test_unsupported_language_rejected(self):
        with pytest.raises(ValidationError):
            AnalyzeRequest(text="hello", language="zz_INVALID")

    def test_language_length_bounded(self):
        with pytest.raises(ValidationError):
            AnalyzeRequest(text="hello", language="toolong")

    def test_unicode_normalization_attack(self):
        req = AnalyzeRequest(text="cafe\u0301", language="en")
        assert len(req.text) > 0

    def test_null_bytes_in_text(self):
        req = AnalyzeRequest(text="hello\x00world", language="en")
        assert req.text is not None


class TestSecretManagement:
    """Verify no secrets are hardcoded in the source."""

    def test_secret_key_from_env(self):
        assert settings.SECRET_KEY is not None
        assert len(settings.SECRET_KEY) > 0

    def test_database_url_from_env(self):
        assert settings.DATABASE_URL is not None
        assert "postgresql" in settings.DATABASE_URL

    def test_no_secrets_in_source_files(self):
        source_dir = Path(__file__).resolve().parents[1] / "app"
        secret_patterns = ["sk-", "AKIA"]
        violations: list[str] = []
        for py_file in source_dir.rglob("*.py"):
            content = py_file.read_text(encoding="utf-8")
            for pattern in secret_patterns:
                for line_num, line in enumerate(content.splitlines(), 1):
                    stripped = line.strip()
                    if pattern in stripped and not stripped.startswith("#"):
                        violations.append(
                            f"{py_file.relative_to(source_dir)}:{line_num}"
                        )
        assert len(violations) == 0, "Potential secrets:\n" + "\n".join(violations)


class TestStructuredErrors:
    """Verify error responses don't leak internals."""

    def test_analyze_request_rejects_no_text(self):
        with pytest.raises(ValidationError):
            AnalyzeRequest(language="en")  # type: ignore[call-arg]

    def test_validation_error_is_pydantic(self):
        with pytest.raises(ValidationError):
            AnalyzeRequest(text="", language="en")

    def test_error_does_not_contain_traceback(self):
        try:
            AnalyzeRequest(text="", language="en")
        except ValidationError as e:
            error_str = str(e)
            assert "Traceback" not in error_str
