/**
 * FAQ data — evidence-based answers for the /faq page.
 *
 * Each FAQ has a precise question, nuanced answer, and optional
 * evidence/citation for rigor. Separated from the page component
 * for testability and i18n readiness.
 */

export interface FAQItem {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly evidence?: string;
}

export const FAQ_ITEMS: readonly FAQItem[] = [
  {
    id: "tamil-cost",
    question: "Why does Tamil text cost up to 4× more to process than English?",
    answer:
      "Tamil uses an abugida script with complex Unicode code points that BPE tokenizers — trained predominantly on English text — have not learned to merge efficiently. Each Tamil character may encode to 3–6 bytes in UTF-8, and without sufficient Tamil training data, the BPE algorithm treats these as individual byte tokens rather than merged subwords. The result: a Tamil sentence generates 3–5× more tokens than an English sentence conveying the same meaning.",
    evidence:
      "Petrov et al. (2023) measured Tamil token counts at 3.2–4.8× English baselines across GPT-4 and LLaMA tokenizers.",
  },
  {
    id: "bias-vs-tokenizer",
    question: "Is the tokenizer biased, or is this just how the algorithm works?",
    answer:
      "Both. BPE is a data-driven algorithm — it learns merge rules from its training corpus. When that corpus is predominantly English (or Latin-script languages), the resulting vocabulary naturally favors those languages. This isn't intentional discrimination; it's a statistical artifact of training data composition. However, the economic consequence is the same: non-English users pay more per API call. Recognizing this as a systemic issue — rather than individual bias — is key to building fairer tokenizers.",
  },
  {
    id: "fairness-meaning",
    question: "What exactly does the fairness score mean? Is 70 good or bad?",
    answer:
      "The fairness score ranges from 0 (extreme disparity) to 100 (perfect parity with English). A score of 70 means the target language uses approximately 30% more tokens than English for equivalent content. We classify ≥70 as 'Fair,' 40–69 as 'Moderate,' and <40 as 'Biased.' However, even a 'Fair' score means non-English users are paying more — the score measures relative disparity, not absolute equity.",
    evidence:
      "Threshold values are derived from Ahia et al. (2023) observations of typical tokenization ratios across 21 languages.",
  },
  {
    id: "estimated-confidence",
    question: "Why do some tokenizers show 'ESTIMATED' confidence?",
    answer:
      "Not all tokenizer providers publish official tokenizer libraries. For example, Anthropic has not released Claude's tokenizer publicly. In these cases, TokenTax uses heuristic estimation based on known characteristics of the tokenizer architecture (typically BPE with a ~100K vocabulary). Estimated counts are accurate within ±15% but should not be treated as exact. The confidence label ensures transparency about measurement precision.",
  },
  {
    id: "glitch-tokens",
    question: "What are glitch tokens and should I be worried?",
    answer:
      "Glitch tokens are entries in a tokenizer's vocabulary that exhibit anomalous behavior — they may decode to unexpected text, produce unusual logprob distributions, or bypass content filters. They're artifacts of the BPE training process, not security vulnerabilities per se. TokenTax detects them for educational purposes: understanding why they exist helps researchers build more robust tokenizer vocabularies. If your text happens to contain glitch tokens, it doesn't mean your input is malicious.",
    evidence:
      "See docs/glitch_tokens.md for our per-tokenizer detection methodology and the SolidGoldMagikarp research thread that first documented this phenomenon.",
  },
  {
    id: "accuracy",
    question: "How accurate are the token counts?",
    answer:
      "For EXACT-confidence tokenizers (tiktoken, SentencePiece, HuggingFace), counts are deterministic — running the same text through the same tokenizer version always produces the same result. For ESTIMATED tokenizers, counts are within ±15% of actual. All text is NFC-normalized before tokenization to prevent encoding-dependent variations. Results include the exact tokenizer library version for full reproducibility.",
  },
  {
    id: "pricing-changes",
    question: "What happens when API providers change their pricing?",
    answer:
      "TokenTax uses immutable, date-versioned pricing snapshots. When a provider changes pricing, we create a new snapshot — we never modify historical data. This means any previous analysis result remains reproducible. The current pricing snapshot version is displayed in all cost calculations. We aim to update snapshots within 48 hours of announced pricing changes.",
    evidence:
      "Current snapshot: 2026-03-01. See /pricing for the full versioned pricing table.",
  },
  {
    id: "languages-supported",
    question: "Why only 16 languages? What about my language?",
    answer:
      "We currently support 16 languages spanning 10 script families and representing diverse tokenization challenges (Latin, Cyrillic, Arabic, Devanagari, CJK, Hangul, Thai, Bengali). Each language requires validation against known tokenizer behavior to ensure our fairness scores are meaningful. We prioritize adding languages where tokenization disparity is highest and research data is available. Community contributions for new languages are welcome — see CONTRIBUTING.md.",
  },
  {
    id: "formula-version",
    question: "What does 'Formula v1.0.0' mean and will it change?",
    answer:
      "Every analysis result embeds a formula_version field (currently 1.0.0) following semantic versioning. Major version changes indicate the fairness formula has changed and scores are not directly comparable across versions. Minor versions add new tokenizers or languages. Patch versions fix bugs without affecting scoring. This versioning ensures that shared results remain interpretable even as the methodology evolves.",
  },
  {
    id: "share-links",
    question: "How long do shared analysis links last?",
    answer:
      "Shared links are persisted in our database with unique short IDs. By default, shared analyses do not expire — they remain accessible indefinitely. Each shared link captures the complete analysis snapshot, including the formula version, tokenizer versions, and pricing snapshot used, so the results are fully self-contained and reproducible even if the underlying methodology is later updated.",
  },
] as const;
