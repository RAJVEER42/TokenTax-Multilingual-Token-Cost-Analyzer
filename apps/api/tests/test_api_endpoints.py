"""
API Endpoint Integration Tests

Tests the HTTP layer for:
- POST /api/v1/analyze request validation and response shape
- GET /api/v1/languages response structure
- GET /api/v1/tokenizers response structure
- Error handling for invalid payloads

Single Responsibility: verify HTTP contract, not business logic.
Uses httpx AsyncClient against the real FastAPI app.
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    """Async HTTP test client against the FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


class TestLanguagesEndpoint:
    """GET /api/v1/languages."""

    @pytest.mark.asyncio
    async def test_returns_200(self, client):
        resp = await client.get("/api/v1/languages")
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_response_shape(self, client):
        resp = await client.get("/api/v1/languages")
        data = resp.json()
        assert "languages" in data
        assert "count" in data
        assert data["count"] > 0
        assert isinstance(data["languages"], list)

    @pytest.mark.asyncio
    async def test_english_in_languages(self, client):
        resp = await client.get("/api/v1/languages")
        codes = [lang["code"] for lang in resp.json()["languages"]]
        assert "en" in codes


class TestTokenizersEndpoint:
    """GET /api/v1/tokenizers."""

    @pytest.mark.asyncio
    async def test_returns_200(self, client):
        resp = await client.get("/api/v1/tokenizers")
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_response_shape(self, client):
        resp = await client.get("/api/v1/tokenizers")
        data = resp.json()
        assert "tokenizers" in data
        assert "count" in data
        assert data["count"] >= 4, "Phase 3 requires ≥4 tokenizers"

    @pytest.mark.asyncio
    async def test_tokenizer_metadata_fields(self, client):
        resp = await client.get("/api/v1/tokenizers")
        for tok in resp.json()["tokenizers"]:
            assert "name" in tok
            assert "version" in tok
            assert "confidence" in tok
            assert tok["confidence"] in ("EXACT", "ESTIMATED")


class TestAnalyzeEndpoint:
    """POST /api/v1/analyze."""

    @pytest.mark.asyncio
    async def test_valid_request_returns_200(self, client):
        resp = await client.post("/api/v1/analyze", json={
            "text": "Hello world",
            "language": "en",
        })
        assert resp.status_code == 200

    @pytest.mark.asyncio
    async def test_response_has_required_fields(self, client):
        resp = await client.post("/api/v1/analyze", json={
            "text": "Hello world",
            "language": "en",
        })
        data = resp.json()
        assert "text_length" in data
        assert "language" in data
        assert "results" in data
        assert "fairness" in data
        assert "formula_version" in data

    @pytest.mark.asyncio
    async def test_results_have_token_counts(self, client):
        resp = await client.post("/api/v1/analyze", json={
            "text": "The quick brown fox jumps over the lazy dog.",
            "language": "en",
        })
        for result in resp.json()["results"]:
            assert "token_count" in result
            assert "char_count" in result
            assert "efficiency_ratio" in result
            assert "tokenizer_name" in result
            assert "tokenizer_version" in result
            assert "confidence" in result

    @pytest.mark.asyncio
    async def test_english_fairness_is_100(self, client):
        resp = await client.post("/api/v1/analyze", json={
            "text": "Hello world",
            "language": "en",
        })
        for f in resp.json()["fairness"]:
            assert f["fairness_score"] == 100.0
            assert f["token_ratio"] == 100.0

    @pytest.mark.asyncio
    async def test_specific_tokenizer_filter(self, client):
        resp = await client.post("/api/v1/analyze", json={
            "text": "Hello world",
            "language": "en",
            "tokenizers": ["tiktoken_cl100k"],
        })
        results = resp.json()["results"]
        assert len(results) == 1
        assert results[0]["tokenizer_name"] == "tiktoken_cl100k"

    @pytest.mark.asyncio
    async def test_unsupported_language_returns_422(self, client):
        resp = await client.post("/api/v1/analyze", json={
            "text": "Hello world",
            "language": "xx",
        })
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_empty_text_returns_422(self, client):
        resp = await client.post("/api/v1/analyze", json={
            "text": "",
            "language": "en",
        })
        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_estimated_confidence_has_warning(self, client):
        resp = await client.post("/api/v1/analyze", json={
            "text": "Hello world",
            "language": "en",
            "tokenizers": ["claude_estimate"],
        })
        data = resp.json()
        assert len(data["warnings"]) > 0
        assert "ESTIMATED" in data["warnings"][0]

    @pytest.mark.asyncio
    async def test_deterministic_output_ordering(self, client):
        resp = await client.post("/api/v1/analyze", json={
            "text": "Hello world",
            "language": "en",
        })
        names = [r["tokenizer_name"] for r in resp.json()["results"]]
        assert names == sorted(names), "Results must be sorted by name"
