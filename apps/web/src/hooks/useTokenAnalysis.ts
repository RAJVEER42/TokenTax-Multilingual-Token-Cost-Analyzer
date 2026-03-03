/**
 * useTokenAnalysis Hook — Phase 5: Production-Grade
 *
 * Encapsulates the full async analysis workflow:
 *   debounce → abort stale → set loading → API call (with retry)
 *   → update store → persist → clear loading
 *   → on failure: try cache fallback → normalize error
 *
 * Why hooks encapsulate async logic:
 * - Components stay purely declarative (render state, fire actions)
 * - Error handling, loading states, retries, and abort live in one place
 * - The store remains a pure state container with no side effects
 * - Easy to test — mock the API service, assert store mutations
 *
 * Why debouncing:
 * - Prevents excessive API calls during typing (50-char word = 50 calls without)
 * - Configurable delay allows tuning per-use-case
 * - Cancels previous pending calls automatically
 *
 * Why aborting previous calls prevents race conditions:
 * - User types "hello", request A fires → user types "world", request B fires
 * - Without abort: if A returns after B, stale "hello" results overwrite "world"
 * - With abort: A is cancelled, only B's response is applied (last-write-wins)
 *
 * Why cached fallback:
 * - If the API is down but localStorage has a previous result, show it
 * - Displays a warning banner so the user knows data may be stale
 * - Better UX than a blank screen with an error message
 */

import { useCallback, useRef, useEffect } from "react";
import { useAnalysisStore } from "@/store/analysisStore";
import { analyzeText, ApiError } from "@/services/api";
import type { AnalyzeRequest } from "@/types";

interface UseTokenAnalysisReturn {
  /** Trigger an analysis with current store state. */
  analyze: () => Promise<void>;

  /** Trigger an analysis with explicit parameters + optional abort signal. */
  analyzeWith: (params: AnalyzeRequest, signal?: AbortSignal) => Promise<void>;

  /** Retry the last failed analysis. */
  retry: () => Promise<void>;

  /** Whether a request is in flight. */
  loading: boolean;

  /** Last error message, if any. */
  error: string | null;

  /** Whether the displayed result is from cache fallback. */
  usingCachedFallback: boolean;

  /** Number of retries attempted on last failure. */
  retryCount: number;
}

/**
 * Normalize any error into a user-friendly message.
 * Users must never see raw backend error messages.
 */
function normalizeError(err: unknown): string {
  if (err instanceof ApiError) {
    // ApiError messages are already user-friendly (built in api.ts)
    return err.message;
  }
  if (err instanceof Error) {
    if (err.name === "AbortError") return "Request was cancelled.";
    return err.message;
  }
  return "An unexpected error occurred.";
}

export function useTokenAnalysis(): UseTokenAnalysisReturn {
  const loading = useAnalysisStore((s) => s.loading);
  const error = useAnalysisStore((s) => s.error);
  const usingCachedFallback = useAnalysisStore((s) => s.usingCachedFallback);
  const retryCount = useAnalysisStore((s) => s.retryCount);
  const inputText = useAnalysisStore((s) => s.inputText);
  const selectedLanguage = useAnalysisStore((s) => s.selectedLanguage);
  const selectedTokenizers = useAnalysisStore((s) => s.selectedTokenizers);
  const analysisResult = useAnalysisStore((s) => s.analysisResult);
  const setLoading = useAnalysisStore((s) => s.setLoading);
  const setError = useAnalysisStore((s) => s.setError);
  const setResult = useAnalysisStore((s) => s.setAnalysisResult);
  const setUsingCachedFallback = useAnalysisStore((s) => s.setUsingCachedFallback);
  const setRetryCount = useAnalysisStore((s) => s.setRetryCount);

  // AbortController for cancelling stale requests
  const abortRef = useRef<AbortController | null>(null);

  // Store last request params for retry
  const lastParamsRef = useRef<AnalyzeRequest | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const analyzeWith = useCallback(
    async (params: AnalyzeRequest, externalSignal?: AbortSignal) => {
      if (!params.text.trim()) {
        setError("Please enter text to analyze.");
        return;
      }

      // Abort any in-flight request (prevents race conditions)
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      // Combine external signal if provided
      const signal = externalSignal
        ? AbortSignal.any([externalSignal, controller.signal])
        : controller.signal;

      lastParamsRef.current = params;
      setLoading(true);
      setError(null);
      setRetryCount(0);

      try {
        const response = await analyzeText(params, signal);

        // Guard against stale response: only apply if this controller is still active
        if (controller.signal.aborted) return;

        setResult(response);
        setUsingCachedFallback(false);
      } catch (err) {
        // Aborted requests are not errors — user moved on
        if (err instanceof DOMException && err.name === "AbortError") return;
        if (err instanceof ApiError && err.code === "ABORTED") return;

        // Guard against stale error
        if (controller.signal.aborted) return;

        const message = normalizeError(err);

        // Cache fallback: if we have a previous result, show it with a warning
        if (analysisResult !== null) {
          setUsingCachedFallback(true);
          setError(message);
          setLoading(false);
          return;
        }

        setError(message);
      } finally {
        // Only clear loading if this is still the active request
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    },
    [setLoading, setError, setResult, setUsingCachedFallback, setRetryCount, analysisResult],
  );

  const analyze = useCallback(async () => {
    await analyzeWith({
      text: inputText,
      language: selectedLanguage,
      tokenizers: selectedTokenizers,
    });
  }, [inputText, selectedLanguage, selectedTokenizers, analyzeWith]);

  const retry = useCallback(async () => {
    const params = lastParamsRef.current;
    if (params == null) return;
    setRetryCount(retryCount + 1);
    await analyzeWith(params);
  }, [analyzeWith, retryCount, setRetryCount]);

  return { analyze, analyzeWith, retry, loading, error, usingCachedFallback, retryCount };
}
