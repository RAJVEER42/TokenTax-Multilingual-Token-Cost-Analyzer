"""
Tests for SharedAnalysis model and share endpoint schemas.

Tests the share model, short ID generation, and schema validation
without requiring a running database.
"""

import pytest

from app.models.shared_analysis import generate_short_id, _SHORT_ID_LENGTH, _SHORT_ID_ALPHABET
from app.schemas.share import ShareCreateRequest, ShareCreateResponse, ShareRetrieveResponse
from app.schemas.analysis import AnalyzeResponse, FairnessResult


class TestShortIdGeneration:
    """Tests for generate_short_id function."""

    def test_generates_correct_length(self):
        sid = generate_short_id()
        assert len(sid) == _SHORT_ID_LENGTH

    def test_uses_valid_alphabet(self):
        for _ in range(100):
            sid = generate_short_id()
            for char in sid:
                assert char in _SHORT_ID_ALPHABET

    def test_generates_unique_ids(self):
        """1000 generated IDs should all be unique (probabilistic but safe)."""
        ids = {generate_short_id() for _ in range(1000)}
        assert len(ids) == 1000

    def test_url_safe_characters(self):
        """Short IDs must be URL-safe (no special chars)."""
        for _ in range(100):
            sid = generate_short_id()
            assert sid.isalnum()

    def test_lowercase_only(self):
        """Short IDs use lowercase + digits only."""
        for _ in range(100):
            sid = generate_short_id()
            assert sid == sid.lower()


class TestShareSchemas:
    """Tests for share request/response schemas."""

    def _make_analyze_response(self) -> dict:
        """Build a minimal valid AnalyzeResponse dict."""
        return {
            "text_length": 11,
            "language": "en",
            "results": [],
            "fairness": [],
            "glitches": [],
            "errors": [],
            "warnings": [],
            "formula_version": "1.0.0",
            "cached": False,
        }

    def test_share_create_request_valid(self):
        data = {
            "input_text": "Hello world",
            "language": "en",
            "payload": self._make_analyze_response(),
        }
        req = ShareCreateRequest(**data)
        assert req.input_text == "Hello world"
        assert req.language == "en"

    def test_share_create_request_rejects_empty_text(self):
        data = {
            "input_text": "",
            "language": "en",
            "payload": self._make_analyze_response(),
        }
        with pytest.raises(Exception):
            ShareCreateRequest(**data)

    def test_share_create_request_rejects_long_language(self):
        data = {
            "input_text": "test",
            "language": "toolong",
            "payload": self._make_analyze_response(),
        }
        with pytest.raises(Exception):
            ShareCreateRequest(**data)

    def test_share_create_response_structure(self):
        resp = ShareCreateResponse(
            short_id="abc12345",
            share_url="/share/abc12345",
            created_at="2026-03-01T00:00:00Z",
        )
        assert resp.short_id == "abc12345"
        assert resp.share_url == "/share/abc12345"

    def test_share_retrieve_response_structure(self):
        resp = ShareRetrieveResponse(
            short_id="abc12345",
            input_text="test",
            language="en",
            payload=self._make_analyze_response(),
            formula_version="1.0.0",
            created_at="2026-03-01T00:00:00Z",
            expires_at=None,
        )
        assert resp.short_id == "abc12345"
        assert resp.expires_at is None

    def test_share_retrieve_response_with_expiry(self):
        resp = ShareRetrieveResponse(
            short_id="abc12345",
            input_text="test",
            language="en",
            payload=self._make_analyze_response(),
            formula_version="1.0.0",
            created_at="2026-03-01T00:00:00Z",
            expires_at="2026-04-01T00:00:00Z",
        )
        assert resp.expires_at is not None

    def test_share_create_preserves_payload_fields(self):
        payload_dict = self._make_analyze_response()
        payload_dict["fairness"] = [
            {
                "tokenizer_name": "tiktoken",
                "fairness_score": 75.5,
                "token_ratio": 124.5,
                "formula_version": "1.0.0",
            }
        ]
        req = ShareCreateRequest(
            input_text="test",
            language="hi",
            payload=payload_dict,
        )
        assert len(req.payload.fairness) == 1
        assert req.payload.fairness[0].fairness_score == 75.5
