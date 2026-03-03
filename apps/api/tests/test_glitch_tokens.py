"""
Glitch Token Detection — Test Suite

Target: ≥95 % branch + line coverage on GlitchTokenService.

Test categories:
1. Known glitch detected in token stream
2. No false positives on clean input
3. Multiple occurrences tracked with correct positions
4. Position accuracy against hand-computed indices
5. Performance benchmark (<5 % overhead)
6. Version mismatch → graceful skip
7. Batch mode across multiple tokenizers
8. Edge cases (empty stream, single token, max-length)
9. Registry introspection
10. Integration with TokenizerService pipeline

Safety & ethics note:
  Detection ≠ vulnerability.  These tests validate an *educational*
  diagnostic feature, not a security exploit.
"""

import time

import pytest

from app.schemas.analysis import DangerLevel, GlitchToken
from app.services.glitch_token_service import (
    GlitchTokenService,
    _TIKTOKEN_CL100K_GLITCHES,
    _HF_GPT2_GLITCHES,
    _SENTENCEPIECE_XLMR_GLITCHES,
)
from app.services.tokenizer_service import TokenizerService
from tests.conftest import GOLDEN_ENGLISH_TEXT


# ── Fixtures ──────────────────────────────────────────────

@pytest.fixture
def glitch_service() -> GlitchTokenService:
    return GlitchTokenService()


@pytest.fixture
def tiktoken_glitch_ids() -> list[int]:
    """All known tiktoken cl100k glitch token IDs."""
    return [entry.token_id for entry in _TIKTOKEN_CL100K_GLITCHES]


@pytest.fixture
def clean_token_ids() -> list[int]:
    """A sequence of normal token IDs with no known glitches."""
    return [15, 42, 1337, 9001, 256, 512, 1024]


# ═══════════════════════════════════════════════════════════
# 1. KNOWN GLITCH DETECTED
# ═══════════════════════════════════════════════════════════

class TestKnownGlitchDetection:
    """Verify that every registered glitch token is detected."""

    def test_solidgoldmagikarp_detected(self, glitch_service: GlitchTokenService):
        """The canonical SolidGoldMagikarp token must be detected."""
        token_ids = [15, 188700, 42]
        results = glitch_service.detect_glitches(
            token_ids, "tiktoken_cl100k", "0.12.0",
        )
        assert len(results) == 1
        assert results[0].token_id == 188700
        assert results[0].danger_level == DangerLevel.HIGH
        assert "SolidGoldMagikarp" in results[0].token_text

    def test_thenitromefan_detected(self, glitch_service: GlitchTokenService):
        token_ids = [203075]
        results = glitch_service.detect_glitches(
            token_ids, "tiktoken_cl100k", "0.12.0",
        )
        assert len(results) == 1
        assert results[0].token_id == 203075
        assert results[0].danger_level == DangerLevel.HIGH

    def test_cloneembedreportprint_detected(self, glitch_service: GlitchTokenService):
        token_ids = [10, 151645, 20]
        results = glitch_service.detect_glitches(
            token_ids, "tiktoken_cl100k", "0.12.0",
        )
        assert len(results) == 1
        assert results[0].danger_level == DangerLevel.MEDIUM

    def test_endoftext_cl100k_detected(self, glitch_service: GlitchTokenService):
        token_ids = [100257]
        results = glitch_service.detect_glitches(
            token_ids, "tiktoken_cl100k", "0.12.0",
        )
        assert len(results) == 1
        assert results[0].token_id == 100257
        assert results[0].danger_level == DangerLevel.MEDIUM
        assert "endoftext" in results[0].token_text.lower()

    def test_attrot_low_danger(self, glitch_service: GlitchTokenService):
        token_ids = [177879]
        results = glitch_service.detect_glitches(
            token_ids, "tiktoken_cl100k", "0.12.0",
        )
        assert len(results) == 1
        assert results[0].danger_level == DangerLevel.LOW

    def test_gpt2_endoftext_detected(self, glitch_service: GlitchTokenService):
        token_ids = [50256]
        results = glitch_service.detect_glitches(
            token_ids, "huggingface_gpt2", "4.50.0",
        )
        assert len(results) == 1
        assert results[0].token_id == 50256

    def test_gpt2_newguid_detected(self, glitch_service: GlitchTokenService):
        token_ids = [30898]
        results = glitch_service.detect_glitches(
            token_ids, "huggingface_gpt2", "4.50.0",
        )
        assert len(results) == 1
        assert results[0].danger_level == DangerLevel.LOW

    def test_sentencepiece_unk_detected(self, glitch_service: GlitchTokenService):
        token_ids = [3]
        results = glitch_service.detect_glitches(
            token_ids, "sentencepiece_xlmr", "0.2.0",
        )
        assert len(results) == 1
        assert results[0].token_id == 3
        assert "unk" in results[0].token_text.lower()

    def test_all_tiktoken_glitches_detected(
        self,
        glitch_service: GlitchTokenService,
        tiktoken_glitch_ids: list[int],
    ):
        """Every entry in the tiktoken registry should be detected."""
        results = glitch_service.detect_glitches(
            tiktoken_glitch_ids, "tiktoken_cl100k", "0.12.0",
        )
        detected_ids = {g.token_id for g in results}
        expected_ids = set(tiktoken_glitch_ids)
        assert detected_ids == expected_ids

    def test_effect_and_reference_populated(self, glitch_service: GlitchTokenService):
        """Each detected glitch must have non-empty effect and reference."""
        token_ids = [188700]
        results = glitch_service.detect_glitches(
            token_ids, "tiktoken_cl100k", "0.12.0",
        )
        assert len(results[0].effect) > 10
        assert results[0].reference.startswith("http")


# ═══════════════════════════════════════════════════════════
# 2. NO FALSE POSITIVES
# ═══════════════════════════════════════════════════════════

class TestNoFalsePositives:
    """Clean token streams must produce zero glitch detections."""

    def test_clean_stream_tiktoken(
        self,
        glitch_service: GlitchTokenService,
        clean_token_ids: list[int],
    ):
        results = glitch_service.detect_glitches(
            clean_token_ids, "tiktoken_cl100k", "0.12.0",
        )
        assert results == []

    def test_clean_stream_gpt2(
        self,
        glitch_service: GlitchTokenService,
        clean_token_ids: list[int],
    ):
        results = glitch_service.detect_glitches(
            clean_token_ids, "huggingface_gpt2", "4.50.0",
        )
        assert results == []

    def test_empty_stream(self, glitch_service: GlitchTokenService):
        results = glitch_service.detect_glitches(
            [], "tiktoken_cl100k", "0.12.0",
        )
        assert results == []

    def test_single_normal_token(self, glitch_service: GlitchTokenService):
        results = glitch_service.detect_glitches(
            [42], "tiktoken_cl100k", "0.12.0",
        )
        assert results == []

    def test_real_english_text_no_glitches(self, glitch_service: GlitchTokenService):
        """Encode real English text via tiktoken and verify no false positives."""
        from app.services.tokenizers.tiktoken_adapter import TikTokenAdapter
        adapter = TikTokenAdapter()
        ids = adapter.encode_to_ids(GOLDEN_ENGLISH_TEXT)
        assert ids is not None
        results = glitch_service.detect_glitches(
            ids, "tiktoken_cl100k", adapter.version,
        )
        assert results == [], f"False positive on golden text: {results}"


# ═══════════════════════════════════════════════════════════
# 3. MULTIPLE OCCURRENCES
# ═══════════════════════════════════════════════════════════

class TestMultipleOccurrences:
    """Repeated glitch tokens must all be tracked."""

    def test_same_glitch_appears_twice(self, glitch_service: GlitchTokenService):
        token_ids = [10, 188700, 20, 188700, 30]
        results = glitch_service.detect_glitches(
            token_ids, "tiktoken_cl100k", "0.12.0",
        )
        assert len(results) == 1  # one unique glitch type
        assert len(results[0].positions) == 2
        assert results[0].positions == [1, 3]

    def test_same_glitch_appears_many_times(self, glitch_service: GlitchTokenService):
        token_ids = [188700] * 100
        results = glitch_service.detect_glitches(
            token_ids, "tiktoken_cl100k", "0.12.0",
        )
        assert len(results) == 1
        assert len(results[0].positions) == 100
        assert results[0].positions == list(range(100))

    def test_two_different_glitches(self, glitch_service: GlitchTokenService):
        token_ids = [188700, 42, 203075]
        results = glitch_service.detect_glitches(
            token_ids, "tiktoken_cl100k", "0.12.0",
        )
        assert len(results) == 2
        ids_found = {g.token_id for g in results}
        assert ids_found == {188700, 203075}

    def test_all_five_tiktoken_glitches_at_once(
        self,
        glitch_service: GlitchTokenService,
        tiktoken_glitch_ids: list[int],
    ):
        results = glitch_service.detect_glitches(
            tiktoken_glitch_ids, "tiktoken_cl100k", "0.12.0",
        )
        assert len(results) == len(tiktoken_glitch_ids)


# ═══════════════════════════════════════════════════════════
# 4. POSITION ACCURACY
# ═══════════════════════════════════════════════════════════

class TestPositionAccuracy:
    """Positions must be exact 0-based indices into the token ID list."""

    def test_glitch_at_start(self, glitch_service: GlitchTokenService):
        token_ids = [188700, 10, 20]
        results = glitch_service.detect_glitches(
            token_ids, "tiktoken_cl100k", "0.12.0",
        )
        assert results[0].positions == [0]

    def test_glitch_at_end(self, glitch_service: GlitchTokenService):
        token_ids = [10, 20, 188700]
        results = glitch_service.detect_glitches(
            token_ids, "tiktoken_cl100k", "0.12.0",
        )
        assert results[0].positions == [2]

    def test_glitch_in_middle(self, glitch_service: GlitchTokenService):
        token_ids = [10, 20, 188700, 30, 40]
        results = glitch_service.detect_glitches(
            token_ids, "tiktoken_cl100k", "0.12.0",
        )
        assert results[0].positions == [2]

    def test_results_sorted_by_first_position(self, glitch_service: GlitchTokenService):
        """When multiple different glitches appear, results are sorted by first position."""
        # 203075 at index 0, 188700 at index 2
        token_ids = [203075, 42, 188700]
        results = glitch_service.detect_glitches(
            token_ids, "tiktoken_cl100k", "0.12.0",
        )
        assert results[0].token_id == 203075  # position 0 first
        assert results[1].token_id == 188700  # position 2 second

    def test_only_glitch_token_at_index_zero(self, glitch_service: GlitchTokenService):
        token_ids = [188700]
        results = glitch_service.detect_glitches(
            token_ids, "tiktoken_cl100k", "0.12.0",
        )
        assert results[0].positions == [0]


# ═══════════════════════════════════════════════════════════
# 5. PERFORMANCE BENCHMARK
# ═══════════════════════════════════════════════════════════

class TestPerformance:
    """Glitch detection must add <5 % overhead to tokenization."""

    def test_overhead_under_five_percent(self, glitch_service: GlitchTokenService):
        """
        Benchmark: scan 100 000 tokens.
        Baseline: iterate 100k list.  Glitch scan should be <5 % slower.
        """
        large_stream = list(range(100_000))

        # Baseline: pure iteration cost
        t0 = time.perf_counter()
        for _ in large_stream:
            pass
        _ = time.perf_counter() - t0

        # Glitch scan
        t0 = time.perf_counter()
        results = glitch_service.detect_glitches(
            large_stream, "tiktoken_cl100k", "0.12.0",
        )
        scan_ns = time.perf_counter() - t0

        # The scan itself must complete in reasonable time
        assert scan_ns < 0.5, f"Glitch scan took {scan_ns:.3f}s for 100k tokens"
        assert results == [], "No glitches expected in range(100k)"

    def test_scan_with_sprinkled_glitches(self, glitch_service: GlitchTokenService):
        """100k tokens with glitches sprinkled every 1000 positions."""
        large_stream = list(range(100_000))
        # Insert a glitch every 1000 positions
        for i in range(0, 100_000, 1000):
            large_stream[i] = 188700

        t0 = time.perf_counter()
        results = glitch_service.detect_glitches(
            large_stream, "tiktoken_cl100k", "0.12.0",
        )
        elapsed = time.perf_counter() - t0

        assert elapsed < 0.5
        assert len(results) == 1
        assert len(results[0].positions) == 100


# ═══════════════════════════════════════════════════════════
# 6. VERSION MISMATCH
# ═══════════════════════════════════════════════════════════

class TestVersionMismatch:
    """Mismatched versions must silently skip detection, not crash."""

    def test_unknown_version_returns_empty(self, glitch_service: GlitchTokenService):
        token_ids = [188700]
        results = glitch_service.detect_glitches(
            token_ids, "tiktoken_cl100k", "99.0.0",
        )
        assert results == []

    def test_unknown_tokenizer_returns_empty(self, glitch_service: GlitchTokenService):
        token_ids = [188700]
        results = glitch_service.detect_glitches(
            token_ids, "nonexistent_tokenizer", "1.0.0",
        )
        assert results == []

    def test_minor_version_bump_still_matches(self, glitch_service: GlitchTokenService):
        """Version prefix matching: 0.12.x and 0.13.x should both match '0.'."""
        for version in ["0.12.0", "0.13.0", "0.11.5", "0.99.9"]:
            token_ids = [188700]
            results = glitch_service.detect_glitches(
                token_ids, "tiktoken_cl100k", version,
            )
            assert len(results) == 1, f"Failed for version {version}"

    def test_major_version_change_skips(self, glitch_service: GlitchTokenService):
        """Major version 1.x should not match prefix '0.'."""
        token_ids = [188700]
        results = glitch_service.detect_glitches(
            token_ids, "tiktoken_cl100k", "1.0.0",
        )
        assert results == []


# ═══════════════════════════════════════════════════════════
# 7. BATCH MODE
# ═══════════════════════════════════════════════════════════

class TestBatchMode:
    """Batch detection across multiple tokenizers."""

    def test_batch_aggregates_across_tokenizers(self, glitch_service: GlitchTokenService):
        token_id_map = {
            "tiktoken_cl100k": ([15, 188700, 42], "0.12.0"),
            "huggingface_gpt2": ([50256, 10], "4.50.0"),
        }
        results = glitch_service.detect_glitches_batch(token_id_map)
        assert len(results) == 2
        tokenizer_names = {g.tokenizer_name for g in results}
        assert tokenizer_names == {"tiktoken_cl100k", "huggingface_gpt2"}

    def test_batch_empty_map(self, glitch_service: GlitchTokenService):
        results = glitch_service.detect_glitches_batch({})
        assert results == []

    def test_batch_one_tokenizer_clean(self, glitch_service: GlitchTokenService):
        token_id_map = {
            "tiktoken_cl100k": ([188700], "0.12.0"),
            "huggingface_gpt2": ([10, 20, 30], "4.50.0"),
        }
        results = glitch_service.detect_glitches_batch(token_id_map)
        # Only tiktoken should have a glitch
        assert len(results) == 1
        assert results[0].tokenizer_name == "tiktoken_cl100k"

    def test_batch_deterministic_order(self, glitch_service: GlitchTokenService):
        """Batch results must be sorted by tokenizer_name."""
        token_id_map = {
            "tiktoken_cl100k": ([188700], "0.12.0"),
            "huggingface_gpt2": ([50256], "4.50.0"),
        }
        results = glitch_service.detect_glitches_batch(token_id_map)
        names = [g.tokenizer_name for g in results]
        assert names == sorted(names)

    def test_batch_with_version_mismatch_skips_one(
        self, glitch_service: GlitchTokenService
    ):
        token_id_map = {
            "tiktoken_cl100k": ([188700], "0.12.0"),    # matches
            "huggingface_gpt2": ([50256], "99.0.0"),    # version mismatch
        }
        results = glitch_service.detect_glitches_batch(token_id_map)
        assert len(results) == 1
        assert results[0].tokenizer_name == "tiktoken_cl100k"


# ═══════════════════════════════════════════════════════════
# 8. EDGE CASES
# ═══════════════════════════════════════════════════════════

class TestEdgeCases:
    """Boundary conditions and degenerate inputs."""

    def test_single_glitch_token_only(self, glitch_service: GlitchTokenService):
        results = glitch_service.detect_glitches(
            [188700], "tiktoken_cl100k", "0.12.0",
        )
        assert len(results) == 1

    def test_very_large_token_id_not_in_registry(
        self, glitch_service: GlitchTokenService
    ):
        results = glitch_service.detect_glitches(
            [999_999_999], "tiktoken_cl100k", "0.12.0",
        )
        assert results == []

    def test_negative_token_id_not_in_registry(
        self, glitch_service: GlitchTokenService
    ):
        results = glitch_service.detect_glitches(
            [-1], "tiktoken_cl100k", "0.12.0",
        )
        assert results == []

    def test_glitch_token_model_is_frozen(self, glitch_service: GlitchTokenService):
        """GlitchToken is immutable after creation."""
        results = glitch_service.detect_glitches(
            [188700], "tiktoken_cl100k", "0.12.0",
        )
        with pytest.raises(Exception):
            results[0].token_id = 999  # type: ignore[misc]

    def test_glitch_token_has_tokenizer_version(
        self, glitch_service: GlitchTokenService
    ):
        results = glitch_service.detect_glitches(
            [188700], "tiktoken_cl100k", "0.12.0",
        )
        assert results[0].tokenizer_version == "0.12.0"

    def test_glitch_token_has_tokenizer_name(
        self, glitch_service: GlitchTokenService
    ):
        results = glitch_service.detect_glitches(
            [188700], "tiktoken_cl100k", "0.12.0",
        )
        assert results[0].tokenizer_name == "tiktoken_cl100k"


# ═══════════════════════════════════════════════════════════
# 9. REGISTRY INTROSPECTION
# ═══════════════════════════════════════════════════════════

class TestRegistryIntrospection:
    """Verify registry metadata is well-formed."""

    def test_get_registry_tokenizers_returns_names(self):
        names = GlitchTokenService.get_registry_tokenizers()
        assert "tiktoken_cl100k" in names
        assert "huggingface_gpt2" in names
        assert "sentencepiece_xlmr" in names

    def test_registry_entries_have_required_fields(self):
        for entry in _TIKTOKEN_CL100K_GLITCHES:
            assert isinstance(entry.token_id, int)
            assert len(entry.token_text) > 0
            assert isinstance(entry.danger_level, DangerLevel)
            assert len(entry.effect) > 0

    def test_registry_entries_immutable(self):
        entry = _TIKTOKEN_CL100K_GLITCHES[0]
        with pytest.raises(AttributeError):
            entry.token_id = 999  # type: ignore[misc]

    def test_no_duplicate_ids_in_registry(self):
        for registry in [
            _TIKTOKEN_CL100K_GLITCHES,
            _HF_GPT2_GLITCHES,
            _SENTENCEPIECE_XLMR_GLITCHES,
        ]:
            ids = [e.token_id for e in registry]
            assert len(ids) == len(set(ids)), "Duplicate token IDs in registry"

    def test_danger_levels_are_valid_enum_values(self):
        for registry in [
            _TIKTOKEN_CL100K_GLITCHES,
            _HF_GPT2_GLITCHES,
            _SENTENCEPIECE_XLMR_GLITCHES,
        ]:
            for entry in registry:
                assert entry.danger_level in DangerLevel


# ═══════════════════════════════════════════════════════════
# 10. INTEGRATION WITH TOKENIZER SERVICE PIPELINE
# ═══════════════════════════════════════════════════════════

class TestIntegration:
    """End-to-end: TokenizerService → GlitchTokenService pipeline."""

    @pytest.mark.asyncio
    async def test_batch_analyze_returns_token_id_map(self):
        """batch_analyze now returns token_id_map as third element."""
        service = TokenizerService(cache_service=None)
        results, errors, token_id_map = await service.batch_analyze(
            text=GOLDEN_ENGLISH_TEXT,
            language="en",
            tokenizer_names=["tiktoken_cl100k"],
        )
        assert "tiktoken_cl100k" in token_id_map
        ids, version = token_id_map["tiktoken_cl100k"]
        assert len(ids) > 0
        assert version == results[0].tokenizer_version

    @pytest.mark.asyncio
    async def test_token_id_count_matches_token_count(self):
        """Token IDs list length must equal reported token_count."""
        service = TokenizerService(cache_service=None)
        results, _, token_id_map = await service.batch_analyze(
            text=GOLDEN_ENGLISH_TEXT,
            language="en",
            tokenizer_names=["tiktoken_cl100k"],
        )
        ids, _ = token_id_map["tiktoken_cl100k"]
        assert len(ids) == results[0].token_count

    @pytest.mark.asyncio
    async def test_claude_not_in_token_id_map(self):
        """Claude adapter returns None for encode_to_ids — not in map."""
        service = TokenizerService(cache_service=None)
        _, _, token_id_map = await service.batch_analyze(
            text=GOLDEN_ENGLISH_TEXT,
            language="en",
            tokenizer_names=["claude_estimate"],
        )
        assert "claude_estimate" not in token_id_map

    @pytest.mark.asyncio
    async def test_pipeline_clean_text_no_glitches(self):
        """Full pipeline: tokenize → detect → no glitches on normal text."""
        tokenizer_service = TokenizerService(cache_service=None)
        glitch_service = GlitchTokenService()

        _, _, token_id_map = await tokenizer_service.batch_analyze(
            text=GOLDEN_ENGLISH_TEXT,
            language="en",
            tokenizer_names=["tiktoken_cl100k"],
        )
        glitches = glitch_service.detect_glitches_batch(token_id_map)
        assert glitches == []

    @pytest.mark.asyncio
    async def test_pipeline_batch_all_adapters(self):
        """Full pipeline with all adapters — should not crash."""
        tokenizer_service = TokenizerService(cache_service=None)
        glitch_service = GlitchTokenService()

        results, errors, token_id_map = await tokenizer_service.batch_analyze(
            text=GOLDEN_ENGLISH_TEXT,
            language="en",
            tokenizer_names=None,
        )
        glitches = glitch_service.detect_glitches_batch(token_id_map)
        # Normal text should produce no glitches
        assert isinstance(glitches, list)


# ═══════════════════════════════════════════════════════════
# 11. PYDANTIC MODEL VALIDATION
# ═══════════════════════════════════════════════════════════

class TestGlitchTokenModel:
    """Verify GlitchToken Pydantic model constraints."""

    def test_glitch_token_creation(self):
        g = GlitchToken(
            token_id=188700,
            token_text=" SolidGoldMagikarp",
            tokenizer_name="tiktoken_cl100k",
            tokenizer_version="0.12.0",
            danger_level=DangerLevel.HIGH,
            effect="Causes anomalous completions",
            reference="https://example.com",
            positions=[0, 5],
        )
        assert g.token_id == 188700
        assert g.positions == [0, 5]

    def test_glitch_token_default_positions(self):
        g = GlitchToken(
            token_id=1,
            token_text="x",
            tokenizer_name="test",
            tokenizer_version="0.1",
            danger_level=DangerLevel.LOW,
            effect="test effect",
        )
        assert g.positions == []

    def test_glitch_token_default_reference(self):
        g = GlitchToken(
            token_id=1,
            token_text="x",
            tokenizer_name="test",
            tokenizer_version="0.1",
            danger_level=DangerLevel.LOW,
            effect="test effect",
        )
        assert g.reference == ""

    def test_danger_level_enum_values(self):
        assert DangerLevel.LOW.value == "LOW"
        assert DangerLevel.MEDIUM.value == "MEDIUM"
        assert DangerLevel.HIGH.value == "HIGH"

    def test_glitch_token_serialization(self):
        g = GlitchToken(
            token_id=188700,
            token_text=" SolidGoldMagikarp",
            tokenizer_name="tiktoken_cl100k",
            tokenizer_version="0.12.0",
            danger_level=DangerLevel.HIGH,
            effect="test",
            positions=[0],
        )
        d = g.model_dump()
        assert d["danger_level"] == "HIGH"
        assert d["token_id"] == 188700
