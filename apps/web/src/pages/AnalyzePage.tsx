/**
 * AnalyzePage — Main analysis workflow page (Phase 5: Integrated)
 *
 * Wires together all components with production-grade integration:
 *   TextInput → LanguageSelector → [Run Analysis] → ResultsPanel
 *   → ComparisonChart → FairnessScoreCard → GlitchTokenWarning
 *
 * Integration features:
 * - Cached fallback banner when API is unreachable
 * - Retry button on retryable failures
 * - Debounced input prevents excessive re-renders
 * - AbortController cancels stale requests
 * - Loading states on all interactive elements
 * - Results persist across page reload (Zustand persist)
 */

import { useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Zap, RotateCcw, RefreshCw, WifiOff, AlertTriangle } from "lucide-react";

import { useAnalysisStore } from "@/store/analysisStore";
import { useTokenAnalysis } from "@/hooks/useTokenAnalysis";
import { fetchLanguages } from "@/services/api";
import type { ChartDataPoint, LanguageInfo } from "@/types";

import TextInput from "@/components/TextInput";
import LanguageSelector from "@/components/LanguageSelector";
import ResultsPanel from "@/components/ResultsPanel";
import ComparisonChart from "@/components/ComparisonChart";
import FairnessScoreCard from "@/components/FairnessScoreCard";
import GlitchTokenWarning from "@/components/GlitchTokenWarning";

/** Fallback language list when the API is unreachable. */
const FALLBACK_LANGUAGES: readonly LanguageInfo[] = [
  { code: "en", name: "English" },
  { code: "zh", name: "Chinese" },
  { code: "ja", name: "Japanese" },
  { code: "ko", name: "Korean" },
  { code: "ar", name: "Arabic" },
  { code: "hi", name: "Hindi" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
] as const;

export default function AnalyzePage() {
  // ── Store ────────────────────────────────────────────
  const inputText = useAnalysisStore((s) => s.inputText);
  const selectedLanguage = useAnalysisStore((s) => s.selectedLanguage);
  const analysisResult = useAnalysisStore((s) => s.analysisResult);
  const setInputText = useAnalysisStore((s) => s.setInputText);
  const setSelectedLanguage = useAnalysisStore((s) => s.setSelectedLanguage);
  const reset = useAnalysisStore((s) => s.reset);

  // ── Hook ─────────────────────────────────────────────
  const {
    analyze,
    retry,
    loading,
    error,
    usingCachedFallback,
  } = useTokenAnalysis();

  // ── Languages query ──────────────────────────────────
  const { data: langData } = useQuery({
    queryKey: ["languages"],
    queryFn: ({ signal }) => fetchLanguages(signal),
    staleTime: 1000 * 60 * 30,
  });

  const languages: readonly LanguageInfo[] =
    langData?.languages ?? FALLBACK_LANGUAGES;

  // ── Derived data ─────────────────────────────────────
  const results = analysisResult?.results ?? [];
  const fairness = analysisResult?.fairness ?? [];
  const warnings = analysisResult?.warnings ?? [];

  const chartData: readonly ChartDataPoint[] = useMemo(
    () =>
      results.map((r) => ({
        tokenizer: r.tokenizer_name,
        displayName: r.tokenizer_name.replace(/_/g, " "),
        tokenCount: r.token_count,
        efficiency: r.efficiency_ratio,
        confidence: r.confidence,
      })),
    [results],
  );

  const hasResults = analysisResult !== null;
  const canAnalyze = inputText.trim().length > 0 && !loading;

  // ── Handlers ─────────────────────────────────────────
  const handleAnalyze = useCallback(() => {
    void analyze();
  }, [analyze]);

  const handleRetry = useCallback(() => {
    void retry();
  }, [retry]);

  const handleReset = useCallback(() => {
    reset();
  }, [reset]);

  // ── Render ───────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-white">
          Token Cost Analyzer
        </h1>
        <p className="text-slate-400 mt-1">
          Enter text and select a language to compare tokenization across
          multiple models.
        </p>
      </header>

      {/* Cached fallback banner */}
      {usingCachedFallback && (
        <div
          role="status"
          className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3"
        >
          <WifiOff className="h-4 w-4 shrink-0 text-amber-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-300">
              Showing cached results
            </p>
            <p className="text-xs text-amber-400/70 mt-0.5">
              The API is unreachable. Displaying your last successful analysis.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className="flex items-center gap-1.5 rounded-md bg-amber-500/20 px-3 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/30"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {/* Input Section */}
      <section className="glass p-6 rounded-xl space-y-5">
        <TextInput
          value={inputText}
          onChange={setInputText}
          placeholder="Enter or paste text to analyze…"
          disabled={loading}
          label="Input text"
        />

        <LanguageSelector
          languages={languages}
          value={selectedLanguage}
          onChange={setSelectedLanguage}
          disabled={loading}
          label="Target language"
        />

        {/* Error display */}
        {error != null && !usingCachedFallback && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-400">{error}</p>
            </div>
            <button
              type="button"
              onClick={handleRetry}
              className="flex items-center gap-1.5 rounded-md bg-red-500/20 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/30"
            >
              <RefreshCw className="h-3 w-3" />
              Retry
            </button>
          </div>
        )}

        {/* Action bar */}
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-slate-500">
            {selectedLanguage.toUpperCase()} ·{" "}
            {inputText.length.toLocaleString()} chars
          </p>

          <div className="flex items-center gap-3">
            {hasResults && (
              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:border-slate-600 hover:text-slate-300 disabled:opacity-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
            <button
              type="button"
              onClick={handleAnalyze}
              disabled={!canAnalyze}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Analyzing…
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Run Analysis
                </>
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Warnings */}
      {warnings.length > 0 && <GlitchTokenWarning warnings={warnings} />}

      {/* Results Section */}
      {(hasResults || loading) && (
        <section className="space-y-6">
          {/* Results table */}
          <ResultsPanel results={results} loading={loading} />

          {/* Chart */}
          {chartData.length > 0 && (
            <div className="glass rounded-xl p-6">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
                Token Count Comparison
              </h2>
              <ComparisonChart data={chartData} height={320} />
            </div>
          )}

          {/* Fairness scores */}
          {fairness.length > 0 && (
            <div>
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">
                Fairness Scores
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {fairness.map((f) => (
                  <FairnessScoreCard
                    key={f.tokenizer_name}
                    result={f}
                    showInfo
                  />
                ))}
              </div>
            </div>
          )}

          {/* Metadata footer */}
          {analysisResult != null && (
            <p className="text-center text-xs text-slate-600">
              {analysisResult.cached ? "Cached result · " : ""}
              Formula {analysisResult.formula_version} · {results.length}{" "}
              tokenizer{results.length !== 1 ? "s" : ""}
            </p>
          )}
        </section>
      )}
    </div>
  );
}
