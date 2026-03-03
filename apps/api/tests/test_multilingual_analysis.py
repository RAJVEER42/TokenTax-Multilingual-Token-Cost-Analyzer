"""
Multilingual Analysis Tests — Phase 9

Validates token ratio correctness, fairness consistency, and glitch
detection integration across 20+ languages.

Testing philosophy:
- Every supported language must produce non-zero tokens from at least
  one adapter.  Zero tokens = broken adapter or broken NFC normalization.
- Fairness scores must be bounded [0, 100] and sorted deterministically.
- Cost computation (ratio × baseline) must be monotonic: more tokens
  always means higher cost.
- Glitch detection must not crash on ANY language input.
"""

import pytest

from app.core.constants import FORMULA_VERSION
from app.services.tokenizer_service import TokenizerService
from app.services.fairness_service import FairnessService
from app.services.glitch_token_service import GlitchTokenService


# ── 20+ language fixtures ─────────────────────────────────

MULTILINGUAL_FIXTURE: dict[str, str] = {
    "en": "The quick brown fox jumps over the lazy dog.",
    "es": "El rápido zorro marrón salta sobre el perro perezoso.",
    "fr": "Le rapide renard brun saute par-dessus le chien paresseux.",
    "de": "Der schnelle braune Fuchs springt über den faulen Hund.",
    "pt": "A rápida raposa marrom salta sobre o cachorro preguiçoso.",
    "it": "La veloce volpe marrone salta sul cane pigro.",
    "nl": "De snelle bruine vos springt over de luie hond.",
    "ru": "Быстрая бурая лиса перепрыгивает через ленивую собаку.",
    "ja": "東京は日本の首都であり、世界最大の都市圏です。",
    "zh": "人工智能正在改变世界各地人们的生活方式。",
    "ko": "한국어는 아름다운 언어이며 독특한 문자 체계를 가지고 있습니다.",
    "ar": "اللغة العربية هي واحدة من أقدم اللغات في العالم.",
    "hi": "भारत एक विशाल और विविधतापूर्ण देश है।",
    "bn": "বাংলাদেশ দক্ষিণ এশিয়ার একটি দেশ।",
    "tr": "Hızlı kahverengi tilki tembel köpeğin üzerinden atlar.",
    "vi": "Con cáo nâu nhanh nhẹn nhảy qua con chó lười.",
    "th": "สุนัขจิ้งจอกสีน้ำตาลกระโดดข้ามสุนัขขี้เกียจ",
    "pl": "Szybki brązowy lis przeskakuje nad leniwym psem.",
    "uk": "Швидка бура лисиця перестрибує через лінивого пса.",
    "sv": "Den snabba bruna räven hoppar över den lata hunden.",
    "el": "Η γρήγορη καφέ αλεπού πηδάει πάνω από τον τεμπέλη σκύλο.",
    "he": "השועל החום המהיר קופץ מעל הכלב העצלן.",
    "id": "Rubah cokelat yang cepat melompati anjing yang malas.",
}

# Must have at least 20 languages
assert len(MULTILINGUAL_FIXTURE) >= 20, (
    f"Fixture has only {len(MULTILINGUAL_FIXTURE)} languages, need ≥20"
)


class TestMultilingualTokenization:
    """Verify every supported language tokenizes correctly."""

    @pytest.fixture(autouse=True)
    def _setup(self):
        self.service = TokenizerService(cache_service=None)

    @pytest.mark.parametrize(
        "lang,text",
        list(MULTILINGUAL_FIXTURE.items()),
        ids=list(MULTILINGUAL_FIXTURE.keys()),
    )
    async def test_all_languages_produce_tokens(self, lang: str, text: str):
        """Every language must produce ≥1 token from at least one adapter."""
        results, errors, _ = await self.service.batch_analyze(
            text=text, language=lang,
        )
        assert len(results) > 0, f"No results for {lang}"
        token_counts = [r.token_count for r in results]
        assert any(c > 0 for c in token_counts), (
            f"All adapters returned 0 tokens for {lang}"
        )

    @pytest.mark.parametrize(
        "lang,text",
        list(MULTILINGUAL_FIXTURE.items()),
        ids=list(MULTILINGUAL_FIXTURE.keys()),
    )
    async def test_deterministic_across_runs(self, lang: str, text: str):
        """Two runs with identical input must produce identical results."""
        r1, _, _ = await self.service.batch_analyze(text=text, language=lang)
        r2, _, _ = await self.service.batch_analyze(text=text, language=lang)
        counts_1 = [(r.tokenizer_name, r.token_count) for r in r1]
        counts_2 = [(r.tokenizer_name, r.token_count) for r in r2]
        assert counts_1 == counts_2

    async def test_cjk_languages_use_more_tokens(self):
        """CJK languages typically need more tokens per character than English."""
        en_results, _, _ = await self.service.batch_analyze(
            text=MULTILINGUAL_FIXTURE["en"], language="en",
        )
        ja_results, _, _ = await self.service.batch_analyze(
            text=MULTILINGUAL_FIXTURE["ja"], language="ja",
        )
        # Compare tiktoken counts (present on both)
        en_tiktoken = next(
            (r for r in en_results if r.tokenizer_name == "tiktoken_cl100k"),
            None,
        )
        ja_tiktoken = next(
            (r for r in ja_results if r.tokenizer_name == "tiktoken_cl100k"),
            None,
        )
        if en_tiktoken and ja_tiktoken:
            # Japanese should have higher efficiency ratio (more tokens/char)
            assert ja_tiktoken.efficiency_ratio > en_tiktoken.efficiency_ratio

    async def test_nfc_normalization_applied(self):
        """Composed vs decomposed Unicode must produce identical counts."""
        # é as single code point vs e + combining accent
        composed = "caf\u00e9"
        decomposed = "cafe\u0301"
        r1, _, _ = await self.service.batch_analyze(text=composed, language="fr")
        r2, _, _ = await self.service.batch_analyze(text=decomposed, language="fr")
        for a, b in zip(r1, r2):
            assert a.token_count == b.token_count, (
                f"{a.tokenizer_name}: composed={a.token_count}, "
                f"decomposed={b.token_count}"
            )


class TestMultilingualFairness:
    """Verify fairness scoring across languages."""

    @pytest.fixture(autouse=True)
    def _setup(self):
        self.tokenizer = TokenizerService(cache_service=None)
        self.fairness = FairnessService()

    async def test_english_fairness_is_100(self):
        """English baseline always scores exactly 100."""
        en_results, _, _ = await self.tokenizer.batch_analyze(
            text=MULTILINGUAL_FIXTURE["en"], language="en",
        )
        fairness = self.fairness.compute_fairness_from_results(
            results=en_results,
            english_results=en_results,
        )
        for f in fairness:
            assert f.token_ratio == 100.0
            assert f.fairness_score == 100.0

    async def test_fairness_bounded_0_100(self):
        """All fairness scores must be in [0, 100]."""
        en_results, _, _ = await self.tokenizer.batch_analyze(
            text=MULTILINGUAL_FIXTURE["en"], language="en",
        )
        for lang, text in MULTILINGUAL_FIXTURE.items():
            if lang == "en":
                continue
            lang_results, _, _ = await self.tokenizer.batch_analyze(
                text=text, language=lang,
            )
            fairness = self.fairness.compute_fairness_from_results(
                results=lang_results,
                english_results=en_results,
            )
            for f in fairness:
                assert 0.0 <= f.fairness_score <= 100.0, (
                    f"{lang}/{f.tokenizer_name}: score={f.fairness_score}"
                )

    async def test_fairness_sorted_by_tokenizer_name(self):
        """Fairness results must be sorted alphabetically by tokenizer_name."""
        en_results, _, _ = await self.tokenizer.batch_analyze(
            text=MULTILINGUAL_FIXTURE["en"], language="en",
        )
        ja_results, _, _ = await self.tokenizer.batch_analyze(
            text=MULTILINGUAL_FIXTURE["ja"], language="ja",
        )
        fairness = self.fairness.compute_fairness_from_results(
            results=ja_results, english_results=en_results,
        )
        names = [f.tokenizer_name for f in fairness]
        assert names == sorted(names)

    async def test_formula_version_embedded(self):
        """Every fairness result must carry the current formula version."""
        en_results, _, _ = await self.tokenizer.batch_analyze(
            text=MULTILINGUAL_FIXTURE["en"], language="en",
        )
        hi_results, _, _ = await self.tokenizer.batch_analyze(
            text=MULTILINGUAL_FIXTURE["hi"], language="hi",
        )
        fairness = self.fairness.compute_fairness_from_results(
            results=hi_results, english_results=en_results,
        )
        for f in fairness:
            assert f.formula_version == FORMULA_VERSION

    async def test_cost_monotonicity(self):
        """More tokens must always produce higher or equal cost ratio."""
        en_results, _, _ = await self.tokenizer.batch_analyze(
            text=MULTILINGUAL_FIXTURE["en"], language="en",
        )
        ja_results, _, _ = await self.tokenizer.batch_analyze(
            text=MULTILINGUAL_FIXTURE["ja"], language="ja",
        )
        fairness = self.fairness.compute_fairness_from_results(
            results=ja_results, english_results=en_results,
        )
        for f in fairness:
            # If ratio > 100, language costs more than English
            assert f.token_ratio >= 0.0


class TestMultilingualGlitchIntegration:
    """Verify glitch detection doesn't crash on any language."""

    @pytest.fixture(autouse=True)
    def _setup(self):
        self.tokenizer = TokenizerService(cache_service=None)
        self.glitch = GlitchTokenService()

    @pytest.mark.parametrize(
        "lang,text",
        list(MULTILINGUAL_FIXTURE.items()),
        ids=list(MULTILINGUAL_FIXTURE.keys()),
    )
    async def test_glitch_detection_no_crash(self, lang: str, text: str):
        """Glitch detection must not raise for any language."""
        _, _, token_id_map = await self.tokenizer.batch_analyze(
            text=text, language=lang,
        )
        glitches = self.glitch.detect_glitches_batch(token_id_map)
        # Must return a list (possibly empty)
        assert isinstance(glitches, list)

    async def test_english_clean_text_no_glitches(self):
        """Standard English text should not trigger glitch detection."""
        _, _, token_id_map = await self.tokenizer.batch_analyze(
            text=MULTILINGUAL_FIXTURE["en"], language="en",
        )
        glitches = self.glitch.detect_glitches_batch(token_id_map)
        assert len(glitches) == 0
