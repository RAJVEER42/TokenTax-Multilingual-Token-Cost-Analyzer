/**
 * FairnessScoreCard — Prominent fairness score display with color coding.
 *
 * Boundary rationale:
 * - Purely presentational: renders a score 0–100 with visual severity.
 * - Uses design tokens only — no hardcoded colors.
 * - Does NOT compute fairness — accepts pre-computed values.
 * - Visual emphasis aligns with metric importance: the score is the
 *   most critical piece of information for researchers, so it gets
 *   the largest typography (font-display) and strongest color coding.
 *
 * Score ranges:
 *   90–100 → Excellent (green)
 *   70–89  → Good (light green)
 *   50–69  → Moderate (amber)
 *   25–49  → Poor (red)
 *   0–24   → Severe (dark red)
 */

import { Info } from "lucide-react";
import { useState } from "react";
import type { FairnessResult } from "@/types";

interface FairnessScoreCardProps {
  /** Fairness result from the API. */
  readonly result: FairnessResult;
  /** Whether to show an info tooltip. */
  readonly showInfo?: boolean;
}

interface ScoreTheme {
  readonly bg: string;
  readonly border: string;
  readonly text: string;
  readonly glow: string;
  readonly label: string;
}

function getScoreTheme(score: number): ScoreTheme {
  if (score >= 90) {
    return {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      glow: "shadow-emerald-500/10",
      label: "Excellent",
    };
  }
  if (score >= 70) {
    return {
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      text: "text-green-400",
      glow: "shadow-green-500/10",
      label: "Good",
    };
  }
  if (score >= 50) {
    return {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-400",
      glow: "shadow-amber-500/10",
      label: "Moderate",
    };
  }
  if (score >= 25) {
    return {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      text: "text-red-400",
      glow: "shadow-red-500/10",
      label: "Poor",
    };
  }
  return {
    bg: "bg-red-600/15",
    border: "border-red-600/40",
    text: "text-red-500",
    glow: "shadow-red-600/15",
    label: "Severe Bias",
  };
}

export default function FairnessScoreCard({
  result,
  showInfo = true,
}: FairnessScoreCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const theme = getScoreTheme(result.fairness_score);

  return (
    <div
      className={`
        relative rounded-xl border p-5 transition-all
        ${theme.bg} ${theme.border} shadow-lg ${theme.glow}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          {result.tokenizer_name}
        </p>
        {showInfo && (
          <button
            type="button"
            className="p-1 text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Fairness score information"
            onClick={() => setShowTooltip((prev) => !prev)}
            onBlur={() => setShowTooltip(false)}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Score */}
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className={`font-display text-4xl font-bold tabular-nums ${theme.text}`}
        >
          {result.fairness_score.toFixed(1)}
        </span>
        <span className="text-xs text-slate-500">/100</span>
      </div>

      {/* Label + Ratio */}
      <div className="mt-2 flex items-center justify-between">
        <span className={`text-xs font-semibold ${theme.text}`}>
          {theme.label}
        </span>
        <span className="text-[10px] font-mono text-slate-500">
          ratio: {result.token_ratio.toFixed(1)}%
        </span>
      </div>

      {/* Version */}
      <p className="mt-3 text-[10px] text-slate-600">
        Formula v{result.formula_version}
      </p>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute right-0 top-full z-10 mt-2 w-64 rounded-lg glass p-4 text-xs text-slate-300 shadow-xl border border-white/10"
          role="tooltip"
        >
          <p className="font-semibold text-slate-200 mb-1">
            Fairness Score
          </p>
          <p>
            Measures how equitably this tokenizer treats the input language
            compared to English. 100 = perfectly fair, 0 = severely biased.
          </p>
          <p className="mt-2 text-slate-500">
            Based on MAD (Median Absolute Deviation) normalized scoring.
          </p>
        </div>
      )}
    </div>
  );
}
