/**
 * Tutorial step definitions for the /learn page.
 *
 * Each step has a title, description, and type used by TutorialStep
 * to render the appropriate interactive demo component.
 *
 * Separated from the page component for testability and single responsibility.
 */

export interface TutorialStepDef {
  readonly id: number;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly type: "intro" | "tokenization" | "bpe" | "multilingual" | "fairness" | "summary";
}

export const TUTORIAL_STEPS: readonly TutorialStepDef[] = [
  {
    id: 0,
    title: "What Are Tokens?",
    subtitle: "Step 1 of 6 · ~30 seconds",
    description:
      "Large Language Models don't read text the way humans do. They split text into small pieces called tokens. A token might be a whole word, part of a word, or even a single character. The way text is split into tokens directly affects how much an API call costs.",
    type: "intro",
  },
  {
    id: 1,
    title: "Tokenization in Action",
    subtitle: "Step 2 of 6 · Interactive demo",
    description:
      "Watch how the same sentence gets split differently by different tokenizers. English words often map 1:1 to tokens, but non-Latin scripts may require many more tokens for the same meaning.",
    type: "tokenization",
  },
  {
    id: 2,
    title: "Byte-Pair Encoding (BPE)",
    subtitle: "Step 3 of 6 · ~30 seconds",
    description:
      "Most modern tokenizers use BPE — an algorithm that learns common character sequences from training data. Because training data is predominantly English, BPE learns efficient English merges first. Characters from other scripts (Arabic, Hindi, CJK) are often left as individual bytes, inflating token counts.",
    type: "bpe",
  },
  {
    id: 3,
    title: "The Multilingual Tax",
    subtitle: "Step 4 of 6 · Interactive comparison",
    description:
      'The "token tax" is the extra cost non-English speakers pay because tokenizers produce more tokens for equivalent content. A sentence in Tamil might use 3–5× more tokens than the same meaning in English — meaning 3–5× the API cost.',
    type: "multilingual",
  },
  {
    id: 4,
    title: "Measuring Fairness",
    subtitle: "Step 5 of 6 · Formula breakdown",
    description:
      "TokenTax quantifies this disparity with a fairness score. We compute the ratio of tokens for your language vs. English for the same text, then normalize to a 0–100 scale. A score of 100 means perfect parity; lower scores indicate greater inequality.",
    type: "fairness",
  },
  {
    id: 5,
    title: "You're Ready!",
    subtitle: "Step 6 of 6 · Summary",
    description:
      "You now understand how tokenization creates hidden cost disparities across languages. Use TokenTax to analyze your own text, compare tokenizers, and quantify the multilingual tax. Every analysis contributes to awareness of this systemic issue.",
    type: "summary",
  },
] as const;

export const TOTAL_STEPS = TUTORIAL_STEPS.length;
