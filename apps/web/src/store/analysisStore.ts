/**
 * TokenTax Analysis Store (Zustand) — Phase 5: Persistent + Resilient
 *
 * Global state for the analysis workflow.
 * Components read state via selectors; they never mutate directly.
 *
 * Why Zustand instead of Redux:
 * - Zero boilerplate — no action creators, reducers, middleware wiring
 * - Works with React 19 concurrent features out of the box
 * - Tiny bundle (~1KB) vs Redux Toolkit (~12KB)
 * - Built-in persist middleware eliminates manual localStorage boilerplate
 *
 * Why NO async logic in the store:
 * - The store is a pure state container — predictable, serializable, testable
 * - Side effects (API calls, retries, abort) live in hooks
 * - This separation means you can snapshot, replay, and debug state transitions
 *   without worrying about network timing or promises
 * - Zustand's contract: set(newState) is synchronous and atomic
 *
 * Why localStorage persistence:
 * - Users can reload the page and see their last analysis result
 * - Schema is versioned — if we change the shape, old data is discarded cleanly
 *   instead of causing runtime crashes from mismatched types
 *
 * Why state must remain predictable:
 * - Every state transition is a pure function: (prevState, action) → nextState
 * - No races, no async gaps between "intent" and "commit"
 * - Makes time-travel debugging possible (future DevTools integration)
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AnalyzeResponse,
  TokenAnalysis,
  FairnessResult,
} from "@/types";

// ── Schema Version ─────────────────────────────────────
// Bump this when the persisted state shape changes.
// The persist middleware will discard stale data automatically.
const STORE_VERSION = 1;

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

  /** Whether current result was restored from cache (API was unreachable). */
  usingCachedFallback: boolean;

  /** Number of retry attempts on the last failed request. */
  retryCount: number;
}

// ── Actions Interface ──────────────────────────────────

interface AnalysisActions {
  setInputText: (text: string) => void;
  setSelectedLanguage: (language: string) => void;
  setSelectedTokenizers: (tokenizers: string[] | null) => void;
  setAnalysisResult: (result: AnalyzeResponse) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setUsingCachedFallback: (using: boolean) => void;
  setRetryCount: (count: number) => void;
  clearResults: () => void;
  reset: () => void;
}

// ── Initial State ──────────────────────────────────────

/** Shape of the slice that gets persisted to localStorage. */
type PersistedSlice = Pick<
  AnalysisState,
  "inputText" | "selectedLanguage" | "selectedTokenizers" | "analysisResult"
>;

const initialState: AnalysisState = {
  inputText: "",
  selectedLanguage: "en",
  selectedTokenizers: null,
  analysisResult: null,
  loading: false,
  error: null,
  usingCachedFallback: false,
  retryCount: 0,
};

// ── Store ──────────────────────────────────────────────

export const useAnalysisStore = create<AnalysisState & AnalysisActions>()(
  persist(
    (set) => ({
      ...initialState,

      setInputText: (text) => set({ inputText: text }),
      setSelectedLanguage: (language) => set({ selectedLanguage: language }),
      setSelectedTokenizers: (tokenizers) =>
        set({ selectedTokenizers: tokenizers }),
      setAnalysisResult: (result) =>
        set({ analysisResult: result, error: null, usingCachedFallback: false }),
      setLoading: (loading) => set({ loading }),
      setError: (error) =>
        set(error !== null ? { error, loading: false } : { error }),
      setUsingCachedFallback: (using) => set({ usingCachedFallback: using }),
      setRetryCount: (count) => set({ retryCount: count }),
      clearResults: () =>
        set({
          analysisResult: null,
          error: null,
          usingCachedFallback: false,
          retryCount: 0,
        }),
      reset: () => set(initialState),
    }),
    {
      name: "tokentax-analysis",
      version: STORE_VERSION,
      // Only persist user inputs and last result — NOT loading/error (transient)
      partialize: (state) => ({
        inputText: state.inputText,
        selectedLanguage: state.selectedLanguage,
        selectedTokenizers: state.selectedTokenizers,
        analysisResult: state.analysisResult,
      }),
      // If the version changes, old data is automatically migrated or discarded.
      // For v1→v2, add migration logic here. For now, discard is safe.
      migrate: (_persisted, version) => {
        if (version < STORE_VERSION) {
          // Discard stale schema — return fresh initial state
          return {
            inputText: "",
            selectedLanguage: "en",
            selectedTokenizers: null,
            analysisResult: null,
          } as PersistedSlice;
        }
        return _persisted as PersistedSlice;
      },
    },
  ),
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
export const selectUsingCachedFallback = (s: AnalysisState) => s.usingCachedFallback;
export const selectRetryCount = (s: AnalysisState) => s.retryCount;

/** Derived: token analysis results. */
export const selectResults = (s: AnalysisState): TokenAnalysis[] =>
  s.analysisResult?.results ?? [];

/** Derived: fairness scores. */
export const selectFairness = (s: AnalysisState): FairnessResult[] =>
  s.analysisResult?.fairness ?? [];

/** Derived: warnings list. */
export const selectWarnings = (s: AnalysisState): string[] =>
  s.analysisResult?.warnings ?? [];

/** Derived: whether there's a result to display. */
export const selectHasResult = (s: AnalysisState): boolean =>
  s.analysisResult !== null;
