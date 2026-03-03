/**
 * TokenTax Analysis Store (Zustand)
 *
 * Global state for the analysis workflow.
 * Components read state via selectors; they never mutate directly.
 *
 * Why Zustand instead of Redux:
 * - Zero boilerplate — no action creators, reducers, middleware wiring
 * - Works with React 18 concurrent features out of the box
 * - Tiny bundle (~1KB) vs Redux Toolkit (~12KB)
 * - Supports selectors for fine-grained re-renders without memoization hacks
 * - For a focused app like TokenTax, Redux's ceremony adds complexity
 *   without proportional benefit
 *
 * Why small-state architecture:
 * - Each store slice has a clear boundary (analysis, UI, etc.)
 * - Reduces cognitive load — you never wonder "where does X live?"
 * - Prevents monolith stores that couple unrelated concerns
 *
 * Why strict typing:
 * - Prevents runtime bugs from typos in state keys
 * - Autocompletion guides developers to valid state shapes
 * - Refactors propagate errors at compile time, not in production
 */

import { create } from "zustand";
import type {
  AnalyzeResponse,
  TokenAnalysis,
  FairnessResult,
} from "@/types";

// ── State Interface ────────────────────────────────────

interface AnalysisState {
  /** Raw user input text. */
  inputText: string;

  /** Selected language code (ISO 639-1). */
  selectedLanguage: string;

  /** Optional filter: specific tokenizer names. null = all. */
  selectedTokenizers: string[] | null;

  /** Full API response from the last analysis. */
  analysisResult: AnalyzeResponse | null;

  /** Whether an analysis request is in flight. */
  loading: boolean;

  /** Error message from the last failed request. */
  error: string | null;
}

// ── Actions Interface ──────────────────────────────────

interface AnalysisActions {
  setInputText: (text: string) => void;
  setSelectedLanguage: (language: string) => void;
  setSelectedTokenizers: (tokenizers: string[] | null) => void;
  setAnalysisResult: (result: AnalyzeResponse) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

// ── Initial State ──────────────────────────────────────

const initialState: AnalysisState = {
  inputText: "",
  selectedLanguage: "en",
  selectedTokenizers: null,
  analysisResult: null,
  loading: false,
  error: null,
};

// ── Store ──────────────────────────────────────────────

export const useAnalysisStore = create<AnalysisState & AnalysisActions>(
  (set) => ({
    ...initialState,

    setInputText: (text) => set({ inputText: text }),
    setSelectedLanguage: (language) => set({ selectedLanguage: language }),
    setSelectedTokenizers: (tokenizers) =>
      set({ selectedTokenizers: tokenizers }),
    setAnalysisResult: (result) =>
      set({ analysisResult: result, error: null }),
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error, loading: false }),
    reset: () => set(initialState),
  }),
);

// ── Selectors ──────────────────────────────────────────
// Fine-grained selectors prevent unnecessary re-renders.
// Components subscribe to exactly the slice they need.

export const selectInputText = (s: AnalysisState) => s.inputText;
export const selectLanguage = (s: AnalysisState) => s.selectedLanguage;
export const selectTokenizers = (s: AnalysisState) => s.selectedTokenizers;
export const selectResult = (s: AnalysisState) => s.analysisResult;
export const selectLoading = (s: AnalysisState) => s.loading;
export const selectError = (s: AnalysisState) => s.error;

/** Derived: token analysis results sorted by name. */
export const selectResults = (s: AnalysisState): TokenAnalysis[] =>
  s.analysisResult?.results ?? [];

/** Derived: fairness scores sorted by name. */
export const selectFairness = (s: AnalysisState): FairnessResult[] =>
  s.analysisResult?.fairness ?? [];

/** Derived: warnings list. */
export const selectWarnings = (s: AnalysisState): string[] =>
  s.analysisResult?.warnings ?? [];

/** Derived: whether there's a result to display. */
export const selectHasResult = (s: AnalysisState): boolean =>
  s.analysisResult !== null;
