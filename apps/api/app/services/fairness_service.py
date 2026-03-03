"""
Fairness Service

Computes BPE fairness scores measuring token inequality across languages.
Single Responsibility: fairness math and scoring.

Design decisions:
- Decoupled from TokenizerService because fairness logic must evolve
  independently. Tokenization is a *measurement*; fairness is an
  *interpretation* of those measurements. Coupling them would violate
  SRP and make it impossible to swap fairness algorithms.
- Uses median-based normalization instead of mean-based because:
  1. BPE token ratios across languages follow a right-skewed distribution
     (CJK languages often have 2-3x the tokens of English).
  2. Mean is sensitive to these extreme outliers — a single high-ratio
     language (e.g. Thai) can dominate the variance and distort scores.
  3. Median is a robust central tendency estimator (breakdown point = 50%).
- Uses Median Absolute Deviation (MAD) instead of standard deviation for
  dispersion because:
  1. SD assumes normality; BPE ratios are NOT normally distributed.
  2. MAD is robust to outliers (breakdown point = 50% vs 0% for SD).
  3. MAD × 1.4826 estimates SD for normal data, but we don't assume
     normality — we use raw MAD for the penalty term.
- Score formula:
      raw = 100 - |ratio - 100| * penalty_weight
      penalty_weight = max(1.0, MAD_normalized_deviation)
      score = clamp(raw, 0, 100)
  The penalty_weight amplifies the score penalty when a tokenizer's
  ratio for this language deviates far from the median behavior.
  This means a tokenizer that is *consistently* expensive across
  languages scores better than one that's cheap for English but
  wildly expensive for Hindi.
- Clamping to [0, 100] is required because:
  1. Extreme ratios (e.g. 500%) can produce negative raw scores.
  2. UI consumers expect a bounded scale.
  3. Without clamping, scores become meaningless ordinal numbers
     rather than interpretable metrics.
- FORMULA_VERSION is embedded in every output. If this algorithm
  changes, the version bumps and downstream consumers know scores
  are no longer comparable with previous versions.

Token Ratio Formula:
    ratio = (tokens_language / tokens_english) * 100
    English baseline always equals 100%.

Fairness Score Derivation:
    Given ratios R = {r_1, r_2, ..., r_n} for n languages under one tokenizer:
    1. median_R = median(R)
    2. MAD = median(|r_i - median_R| for all i)
    3. For a specific language with ratio r:
       deviation = |r - 100|   (distance from English baseline)
       if MAD > 0:
           normalized_dev = |r - median_R| / MAD
       else:
           normalized_dev = 0  (all ratios identical → perfectly fair)
       penalty = max(1.0, 1.0 + 0.5 * normalized_dev)
       raw_score = 100 - deviation * (penalty / 10)
       score = clamp(raw_score, 0, 100)
    4. Round to FLOAT_PRECISION decimal places.
"""

import statistics
from typing import Optional

import structlog

from app.core.constants import (
    ENGLISH_BASELINE_RATIO,
    FAIRNESS_SCORE_MAX,
    FAIRNESS_SCORE_MIN,
    FLOAT_PRECISION,
    FORMULA_VERSION,
)
from app.schemas.analysis import FairnessResult
from app.schemas.tokenizer import TokenAnalysis

logger = structlog.get_logger(__name__)


class FairnessService:
    """
    Computes BPE fairness scores using robust statistics.

    Stateless service — all data is passed in, no side effects.
    This makes it trivially testable and deterministic.
    """

    FORMULA_VERSION: str = FORMULA_VERSION

    @staticmethod
    def compute_token_ratio(
        lang_tokens: int, english_tokens: int
    ) -> float:
        """
        Compute token ratio relative to English baseline.

        Formula: ratio = (lang_tokens / english_tokens) * 100
        English always equals 100.0.

        Safe division: returns ENGLISH_BASELINE_RATIO if english_tokens == 0.
        """
        if english_tokens <= 0:
            return ENGLISH_BASELINE_RATIO
        return round(
            (lang_tokens / english_tokens) * ENGLISH_BASELINE_RATIO,
            FLOAT_PRECISION,
        )

    @staticmethod
    def _compute_mad(values: list[float]) -> float:
        """
        Median Absolute Deviation.

        MAD = median(|x_i - median(X)|)

        Returns 0.0 if fewer than 2 values (no dispersion).
        """
        if len(values) < 2:
            return 0.0
        med = statistics.median(values)
        deviations = [abs(v - med) for v in values]
        return statistics.median(deviations)

    def calculate_bpe_fairness_score(
        self,
        ratio: float,
        all_ratios: list[float],
    ) -> float:
        """
        Compute fairness score for a single language under a single tokenizer.

        Args:
            ratio: this language's token ratio (English = 100.0)
            all_ratios: ratios for ALL languages under this tokenizer

        Returns:
            Score in [0, 100]. Higher = more equitable.

        See module docstring for full mathematical derivation.
        """
        # Distance from English baseline
        deviation = abs(ratio - ENGLISH_BASELINE_RATIO)

        # Robust dispersion across all languages for this tokenizer
        mad = self._compute_mad(all_ratios)
        median_ratio = (
            statistics.median(all_ratios) if all_ratios else ENGLISH_BASELINE_RATIO
        )

        # Normalized deviation: how far is this language from the median,
        # measured in MAD units. If MAD is 0, all languages are identical.
        if mad > 0:
            normalized_dev = abs(ratio - median_ratio) / mad
        else:
            normalized_dev = 0.0

        # Penalty weight: base 1.0 + scaled deviation.
        # Languages far from the median get extra penalty.
        penalty = max(1.0, 1.0 + 0.5 * normalized_dev)

        # Raw score: 100 minus penalized deviation
        raw_score = FAIRNESS_SCORE_MAX - deviation * (penalty / 10.0)

        # Clamp to [0, 100]
        clamped = max(FAIRNESS_SCORE_MIN, min(FAIRNESS_SCORE_MAX, raw_score))

        return round(clamped, FLOAT_PRECISION)

    def compute_fairness_for_tokenizer(
        self,
        tokenizer_name: str,
        language_ratios: dict[str, float],
        target_language: str,
    ) -> Optional[FairnessResult]:
        """
        Compute a FairnessResult for a specific (tokenizer, language) pair.

        Args:
            tokenizer_name: adapter name
            language_ratios: {lang_code: ratio} for this tokenizer
            target_language: the language to score

        Returns:
            FairnessResult or None if target_language not in ratios.
        """
        if target_language not in language_ratios:
            logger.warning(
                "fairness.missing_language",
                tokenizer=tokenizer_name,
                language=target_language,
            )
            return None

        ratio = language_ratios[target_language]
        all_ratios = list(language_ratios.values())
        score = self.calculate_bpe_fairness_score(ratio, all_ratios)

        return FairnessResult(
            tokenizer_name=tokenizer_name,
            fairness_score=score,
            token_ratio=ratio,
            formula_version=self.FORMULA_VERSION,
        )

    def compute_fairness_from_results(
        self,
        results: list[TokenAnalysis],
        english_results: list[TokenAnalysis],
    ) -> list[FairnessResult]:
        """
        Compute fairness scores from tokenization results.

        Given results for a target language and English results for the
        same text, computes ratio + fairness for each tokenizer.

        Args:
            results: TokenAnalysis list for the target language
            english_results: TokenAnalysis list for English (baseline)

        Returns:
            list[FairnessResult] sorted by tokenizer_name
        """
        # Build English baseline lookup
        en_map: dict[str, int] = {
            r.tokenizer_name: r.token_count for r in english_results
        }

        fairness_results: list[FairnessResult] = []

        for analysis in results:
            en_tokens = en_map.get(analysis.tokenizer_name, 0)
            ratio = self.compute_token_ratio(analysis.token_count, en_tokens)

            # For MAD computation, we'd ideally have ratios across many
            # languages. With a single pair (en, target), we use the
            # ratio itself + baseline as the distribution.
            all_ratios = [ENGLISH_BASELINE_RATIO, ratio]

            score = self.calculate_bpe_fairness_score(ratio, all_ratios)

            fairness_results.append(FairnessResult(
                tokenizer_name=analysis.tokenizer_name,
                fairness_score=score,
                token_ratio=ratio,
                formula_version=self.FORMULA_VERSION,
            ))

        fairness_results.sort(key=lambda f: f.tokenizer_name)
        return fairness_results
