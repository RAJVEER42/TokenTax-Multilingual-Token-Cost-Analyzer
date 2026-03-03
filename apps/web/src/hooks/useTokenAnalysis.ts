/**
 * useTokenAnalysis Hook
 *
 * Encapsulates the async analysis workflow:
 *   set loading → call API → update store → clear loading
 *
 * Why hooks encapsulate async logic:
 * - Components stay purely declarative (render state, fire actions)
 * - Error handling, loading states, and retries live in one place
 * - Easy to test — mock the API service, assert store mutations
 * - Hooks must not mutate global state directly beyond the store
 */

import { useCallback } from "react";
import { useAnalysisStore } from "@/store/analysisStore";
import { analyzeText, ApiError } from "@/services/api";
import type { AnalyzeRequest } from "@/types";

interface UseTokenAnalysisReturn {
  /** Trigger an analysis with current store state. */
  analyze: () => Promise<void>;

  /** Trigger an analysis with explicit parameters. */
  analyzeWith: (params: AnalyzeRequest) => Promise<void>;

  /** Whether a request is in flight. */
  loading: boolean;

  /** Last error message, if any. */
  error: string | null;
}

export function useTokenAnalysis(): UseTokenAnalysisReturn {
  const loading = useAnalysisStore((s) => s.loading);
  const error = useAnalysisStore((s) => s.error);
  const inputText = useAnalysisStore((s) => s.inputText);
  const selectedLanguage = useAnalysisStore((s) => s.selectedLanguage);
  const selectedTokenizers = useAnalysisStore((s) => s.selectedTokenizers);
  const setLoading = useAnalysisStore((s) => s.setLoading);
  const setError = useAnalysisStore((s) => s.setError);
  const setResult = useAnalysisStore((s) => s.setAnalysisResult);

  const analyzeWith = useCallback(
    async (params: AnalyzeRequest) => {
      if (!params.text.trim()) {
        setError("Please enter text to analyze.");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await analyzeText(params);
        setResult(response);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(`Analysis failed (${err.status}): ${err.message}`);
        } else if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("An unexpected error occurred.");
        }
      } finally {
        setLoading(false);
      }
    },
    [setLoading, setError, setResult],
  );

  const analyze = useCallback(async () => {
    await analyzeWith({
      text: inputText,
      language: selectedLanguage,
      tokenizers: selectedTokenizers,
    });
  }, [inputText, selectedLanguage, selectedTokenizers, analyzeWith]);

  return { analyze, analyzeWith, loading, error };
}
