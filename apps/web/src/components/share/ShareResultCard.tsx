/**
 * ShareResultCard — Deterministic rendering of a shared analysis.
 *
 * This component renders the analysis snapshot in a visually consistent
 * format suitable for both the share page and PNG export.
 * It does NOT call any API — it renders pure props.
 */

import { Scale, Zap, AlertTriangle } from "lucide-react";
import type { AnalyzeResponse } from "@/types";
import { getFairnessThreshold } from "@/lib/constants";

export default function ShareResultCard({
  data,
  language,
}: {
  readonly data: AnalyzeResponse;
  readonly language: string;
}) {
  const avgFairness =
    data.fairness.length > 0
      ? data.fairness.reduce((sum, f) => sum + f.fairness_score, 0) /
        data.fairness.length
      : 100;
  const threshold = getFairnessThreshold(avgFairness);

  return (
    <div className="space-y-4">
      {/* Header bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white">TokenTax Analysis</h2>
          <p className="text-xs text-slate-500">
            Language: {language} · {data.text_length} characters · Formula v{data.formula_version}
          </p>
        </div>
        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${threshold.bgClass} ${threshold.textClass} border ${threshold.borderClass}`}>
          <div className="flex items-center gap-1.5">
            <Scale className="w-3.5 h-3.5" />
            {avgFairness.toFixed(1)} — {threshold.label}
          </div>
        </div>
      </div>

      {/* Tokenizer results grid */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        {data.results.map((r) => {
          const fairness = data.fairness.find(
            (f) => f.tokenizer_name === r.tokenizer_name,
          );
          const fScore = fairness?.fairness_score ?? 100;
          const fThreshold = getFairnessThreshold(fScore);

          return (
            <div
              key={r.tokenizer_name}
              className="bg-slate-900/60 border border-white/6 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white">
                  {r.tokenizer_name}
                </span>
                <span className={`text-xs ${fThreshold.textClass}`}>
                  {fScore.toFixed(1)}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-slate-500">Tokens</p>
                  <p className="text-white font-mono">{r.token_count.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-slate-500">Efficiency</p>
                  <p className="text-white font-mono">{r.efficiency_ratio.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-slate-500">Confidence</p>
                  <p className={r.confidence === "EXACT" ? "text-emerald-400" : "text-amber-400"}>
                    {r.confidence}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Version</p>
                  <p className="text-slate-300">{r.tokenizer_version}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Glitch token count */}
      {data.glitches.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-400">
          <AlertTriangle className="w-3.5 h-3.5" />
          {data.glitches.length} glitch token{data.glitches.length !== 1 ? "s" : ""} detected
        </div>
      )}

      {/* Warnings */}
      {data.warnings.length > 0 && (
        <div className="space-y-1">
          {data.warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-amber-400/80">
              <Zap className="w-3 h-3 shrink-0 mt-0.5" />
              {w}
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="pt-3 border-t border-white/6 flex items-center justify-between text-[10px] text-slate-600">
        <span>TokenTax · tokentax.dev</span>
        <span>Generated {new Date().toISOString().split("T")[0]}</span>
      </div>
    </div>
  );
}
