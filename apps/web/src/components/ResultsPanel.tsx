/**
 * ResultsPanel — Container displaying per-tokenizer analysis results.
 *
 * Boundary rationale:
 * - Purely presentational: accepts structured result objects, renders them.
 * - Does NOT compute fairness or call APIs — that's the service/hook layer.
 * - Conditional rendering: shows nothing if no results yet.
 * - Separated from ComparisonChart because tabular data and charts serve
 *   different cognitive purposes (precision vs pattern recognition).
 */

import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import type { TokenAnalysis, ConfidenceLevel } from "@/types";

interface ResultsPanelProps {
  /** Per-tokenizer analysis results. */
  readonly results: readonly TokenAnalysis[];
  /** Whether results are currently loading. */
  readonly loading?: boolean;
}

function ConfidenceBadge({ level }: { readonly level: ConfidenceLevel }) {
  const styles =
    level === "EXACT"
      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
      : "bg-amber-500/15 text-amber-400 border-amber-500/30";

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles}`}
    >
      {level}
    </span>
  );
}

function EfficiencyIndicator({ ratio }: { readonly ratio: number }) {
  if (ratio < 0.3) {
    return (
      <span className="inline-flex items-center gap-0.5 text-emerald-400">
        <ArrowDownRight className="h-3 w-3" />
        Efficient
      </span>
    );
  }
  if (ratio > 0.8) {
    return (
      <span className="inline-flex items-center gap-0.5 text-red-400">
        <ArrowUpRight className="h-3 w-3" />
        Expensive
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 text-slate-400">
      <Minus className="h-3 w-3" />
      Average
    </span>
  );
}

export default function ResultsPanel({
  results,
  loading = false,
}: ResultsPanelProps) {
  if (loading) {
    return (
      <div className="glass rounded-xl p-6">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm text-slate-400">Analyzing text…</p>
        </div>
      </div>
    );
  }

  if (results.length === 0) {
    return null;
  }

  return (
    <div className="glass rounded-xl overflow-hidden">
      <div className="border-b border-white/[0.06] px-6 py-4">
        <h3 className="text-sm font-semibold text-slate-200">
          Tokenization Results
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          {results.length} tokenizer{results.length !== 1 ? "s" : ""} analyzed
        </p>
      </div>

      {/* ── Desktop Table ─────────────────────────── */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-6 py-3 font-medium">Tokenizer</th>
              <th className="px-6 py-3 font-medium text-right">Tokens</th>
              <th className="px-6 py-3 font-medium text-right">Chars</th>
              <th className="px-6 py-3 font-medium text-right">Efficiency</th>
              <th className="px-6 py-3 font-medium">Confidence</th>
              <th className="px-6 py-3 font-medium">Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {results.map((r) => (
              <tr
                key={r.tokenizer_name}
                className="transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-200">
                    {r.tokenizer_name}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    v{r.tokenizer_version}
                  </p>
                </td>
                <td className="px-6 py-4 text-right font-mono tabular-nums text-slate-200">
                  {r.token_count.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right font-mono tabular-nums text-slate-400">
                  {r.char_count.toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right font-mono tabular-nums text-slate-300">
                  {r.efficiency_ratio.toFixed(4)}
                </td>
                <td className="px-6 py-4">
                  <ConfidenceBadge level={r.confidence} />
                </td>
                <td className="px-6 py-4 text-xs">
                  <EfficiencyIndicator ratio={r.efficiency_ratio} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Mobile Cards ──────────────────────────── */}
      <div className="md:hidden divide-y divide-white/[0.04]">
        {results.map((r) => (
          <div key={r.tokenizer_name} className="px-5 py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-200 text-sm">
                  {r.tokenizer_name}
                </p>
                <p className="text-[11px] text-slate-500">
                  v{r.tokenizer_version}
                </p>
              </div>
              <ConfidenceBadge level={r.confidence} />
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-slate-500">Tokens</p>
                <p className="font-mono text-sm font-semibold text-slate-200">
                  {r.token_count.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Chars</p>
                <p className="font-mono text-sm text-slate-400">
                  {r.char_count.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Ratio</p>
                <p className="font-mono text-sm text-slate-300">
                  {r.efficiency_ratio.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
