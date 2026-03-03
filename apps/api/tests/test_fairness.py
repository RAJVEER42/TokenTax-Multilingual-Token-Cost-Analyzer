"""
Fairness Service Unit Tests

Tests the fairness scoring algorithm for:
- Mathematical correctness
- Determinism across runs
- Boundary conditions (clamping at 0 and 100)
- Symmetry of outlier penalization
- English baseline always equals 100
- Formula version embedding

Single Responsibility: verify fairness math in isolation.
"""


from app.core.constants import (
    ENGLISH_BASELINE_RATIO,
    FAIRNESS_SCORE_MAX,
    FAIRNESS_SCORE_MIN,
    FORMULA_VERSION,
)
from app.schemas.analysis import FairnessResult
from app.schemas.tokenizer import ConfidenceLevel, TokenAnalysis
from app.services.fairness_service import FairnessService


class TestTokenRatio:
    """Tests for compute_token_ratio."""

    def setup_method(self):
        self.service = FairnessService()

    def test_english_baseline_is_100(self):
        """Same token count → ratio = 100."""
        ratio = self.service.compute_token_ratio(50, 50)
        assert ratio == ENGLISH_BASELINE_RATIO

    def test_double_tokens_is_200(self):
        """Twice the tokens → ratio = 200."""
        ratio = self.service.compute_token_ratio(100, 50)
        assert ratio == 200.0

    def test_half_tokens_is_50(self):
        """Half the tokens → ratio = 50."""
        ratio = self.service.compute_token_ratio(25, 50)
        assert ratio == 50.0

    def test_zero_english_returns_baseline(self):
        """Division by zero protection."""
        ratio = self.service.compute_token_ratio(100, 0)
        assert ratio == ENGLISH_BASELINE_RATIO

    def test_negative_english_returns_baseline(self):
        ratio = self.service.compute_token_ratio(100, -5)
        assert ratio == ENGLISH_BASELINE_RATIO

    def test_determinism(self):
        r1 = self.service.compute_token_ratio(150, 100)
        r2 = self.service.compute_token_ratio(150, 100)
        assert r1 == r2


class TestMAD:
    """Tests for Median Absolute Deviation computation."""

    def setup_method(self):
        self.service = FairnessService()

    def test_single_value_returns_zero(self):
        assert self.service._compute_mad([100.0]) == 0.0

    def test_empty_returns_zero(self):
        assert self.service._compute_mad([]) == 0.0

    def test_identical_values_returns_zero(self):
        assert self.service._compute_mad([100.0, 100.0, 100.0]) == 0.0

    def test_known_values(self):
        """MAD of [1, 2, 3, 4, 5]: median=3, deviations=[2,1,0,1,2], MAD=1."""
        mad = self.service._compute_mad([1.0, 2.0, 3.0, 4.0, 5.0])
        assert mad == 1.0

    def test_symmetric_distribution(self):
        """Symmetric data around 100: [80, 90, 100, 110, 120]."""
        mad = self.service._compute_mad([80.0, 90.0, 100.0, 110.0, 120.0])
        assert mad == 10.0

    def test_skewed_distribution(self):
        """Right-skewed: [100, 105, 110, 200, 300]."""
        mad = self.service._compute_mad([100.0, 105.0, 110.0, 200.0, 300.0])
        # median=110, deviations=[10, 5, 0, 90, 190], MAD=10
        assert mad == 10.0


class TestFairnessScore:
    """Tests for the main fairness scoring algorithm."""

    def setup_method(self):
        self.service = FairnessService()

    def test_english_ratio_100_scores_100(self):
        """A ratio of 100 (English baseline) → perfect score."""
        score = self.service.calculate_bpe_fairness_score(
            ratio=100.0,
            all_ratios=[100.0, 100.0, 100.0],
        )
        assert score == FAIRNESS_SCORE_MAX

    def test_score_always_clamped_above_zero(self):
        """Extreme ratio should clamp to 0, not go negative."""
        score = self.service.calculate_bpe_fairness_score(
            ratio=500.0,
            all_ratios=[100.0, 500.0],
        )
        assert score >= FAIRNESS_SCORE_MIN

    def test_score_always_clamped_below_100(self):
        """Score should never exceed 100."""
        score = self.service.calculate_bpe_fairness_score(
            ratio=100.0,
            all_ratios=[100.0, 200.0, 300.0],
        )
        assert score <= FAIRNESS_SCORE_MAX

    def test_higher_ratio_means_lower_score(self):
        """A language with ratio 200 should score lower than ratio 110."""
        all_ratios = [100.0, 110.0, 150.0, 200.0]
        score_110 = self.service.calculate_bpe_fairness_score(110.0, all_ratios)
        score_200 = self.service.calculate_bpe_fairness_score(200.0, all_ratios)
        assert score_110 > score_200

    def test_symmetric_penalty(self):
        """Ratio 80 and ratio 120 should score similarly (symmetric penalty)."""
        all_ratios = [80.0, 100.0, 120.0]
        score_80 = self.service.calculate_bpe_fairness_score(80.0, all_ratios)
        score_120 = self.service.calculate_bpe_fairness_score(120.0, all_ratios)
        # Symmetry: same deviation from 100, same median context
        assert abs(score_80 - score_120) < 1.0

    def test_determinism(self):
        all_ratios = [100.0, 150.0, 200.0, 250.0]
        s1 = self.service.calculate_bpe_fairness_score(150.0, all_ratios)
        s2 = self.service.calculate_bpe_fairness_score(150.0, all_ratios)
        assert s1 == s2

    def test_all_identical_ratios_score_100(self):
        """If all languages tokenize identically → perfect equity."""
        score = self.service.calculate_bpe_fairness_score(
            ratio=100.0,
            all_ratios=[100.0, 100.0, 100.0, 100.0],
        )
        assert score == FAIRNESS_SCORE_MAX

    def test_formula_version_is_embedded(self):
        assert self.service.FORMULA_VERSION == FORMULA_VERSION


class TestFairnessFromResults:
    """Tests for compute_fairness_from_results integration."""

    def setup_method(self):
        self.service = FairnessService()

    def _make_analysis(
        self, name: str, token_count: int, language: str
    ) -> TokenAnalysis:
        return TokenAnalysis(
            tokenizer_name=name,
            tokenizer_version="1.0.0",
            token_count=token_count,
            char_count=100,
            efficiency_ratio=token_count / 100,
            confidence=ConfidenceLevel.EXACT,
            language=language,
        )

    def test_english_vs_english_is_perfect(self):
        en = [self._make_analysis("test_tok", 50, "en")]
        results = self.service.compute_fairness_from_results(en, en)
        assert len(results) == 1
        assert results[0].token_ratio == ENGLISH_BASELINE_RATIO
        assert results[0].fairness_score == FAIRNESS_SCORE_MAX

    def test_double_tokens_produces_low_score(self):
        """Language using 2x tokens → ratio=200, low fairness."""
        target = [self._make_analysis("tok1", 100, "ja")]
        english = [self._make_analysis("tok1", 50, "en")]
        results = self.service.compute_fairness_from_results(target, english)
        assert len(results) == 1
        assert results[0].token_ratio == 200.0
        assert results[0].fairness_score < 90.0

    def test_results_sorted_by_name(self):
        target = [
            self._make_analysis("z_tok", 60, "ja"),
            self._make_analysis("a_tok", 70, "ja"),
        ]
        english = [
            self._make_analysis("z_tok", 50, "en"),
            self._make_analysis("a_tok", 50, "en"),
        ]
        results = self.service.compute_fairness_from_results(target, english)
        names = [r.tokenizer_name for r in results]
        assert names == sorted(names)

    def test_missing_english_baseline_uses_default(self):
        """If english_results doesn't have a matching tokenizer → ratio = 100."""
        target = [self._make_analysis("tok_missing", 50, "ja")]
        english = []  # no English baseline
        results = self.service.compute_fairness_from_results(target, english)
        assert results[0].token_ratio == ENGLISH_BASELINE_RATIO

    def test_formula_version_in_output(self):
        target = [self._make_analysis("tok1", 50, "ja")]
        english = [self._make_analysis("tok1", 50, "en")]
        results = self.service.compute_fairness_from_results(target, english)
        assert results[0].formula_version == FORMULA_VERSION


class TestComputeFairnessForTokenizer:
    """Tests for compute_fairness_for_tokenizer method."""

    def setup_method(self):
        self.service = FairnessService()

    def test_valid_language_returns_result(self):
        ratios = {"en": 100.0, "ja": 180.0, "hi": 220.0}
        result = self.service.compute_fairness_for_tokenizer(
            "test_tok", ratios, "ja"
        )
        assert result is not None
        assert isinstance(result, FairnessResult)
        assert result.tokenizer_name == "test_tok"
        assert result.token_ratio == 180.0

    def test_missing_language_returns_none(self):
        ratios = {"en": 100.0, "ja": 180.0}
        result = self.service.compute_fairness_for_tokenizer(
            "test_tok", ratios, "ko"
        )
        assert result is None

    def test_score_correlates_with_known_bias(self):
        """Known BPE bias: CJK > Latin. Higher ratio → lower score."""
        ratios = {
            "en": 100.0,
            "es": 110.0,
            "ja": 220.0,
            "zh": 200.0,
            "hi": 250.0,
        }
        en_result = self.service.compute_fairness_for_tokenizer(
            "test_tok", ratios, "en"
        )
        ja_result = self.service.compute_fairness_for_tokenizer(
            "test_tok", ratios, "ja"
        )
        hi_result = self.service.compute_fairness_for_tokenizer(
            "test_tok", ratios, "hi"
        )
        assert en_result.fairness_score > ja_result.fairness_score
        assert en_result.fairness_score > hi_result.fairness_score
