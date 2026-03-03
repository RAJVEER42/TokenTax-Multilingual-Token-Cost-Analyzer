/**
 * LanguageHeatmap — Token ratio visualization vs English baseline.
 *
 * Why heatmap:
 * - Color-encodes bias intensity at a glance
 * - English = 100% baseline is explicitly labeled (no hidden normalization)
 * - Perceptually uniform color scale: green (fair) → amber → red (biased)
 *
 * Why ratio must be explicitly labeled:
 * - Users must understand "200%" means 2× more tokens than English
 * - Without context, numbers are meaningless
 *
 * Why baseline normalization is essential:
 * - Raw token counts are incomparable across tokenizers
 * - Ratio to English reveals structural bias
 */

import { memo } from "react";
import type { HeatmapCell } from "@/types/visualization";

interface LanguageHeatmapProps {
  readonly data: readonly HeatmapCell[];
  readonly language: string;
}

function HeatmapCellCard({ cell }: { readonly cell: HeatmapCell }) {
  const isBaseline = cell.ratioPercent === 100;

  return (
    <div
      className="relative rounded-lg border p-4 transition-all hover:scale-[1.02]"
      style={{
        borderColor: `${cell.color}40`,
        background: `${cell.color}15`,
      }}
    >
      {/* Tokenizer name */}
      <p className="text-xs font-medium text-slate-300 truncate">
        {cell.displayName}
      </p>

      {/* Ratio percentage */}
      <p
        className="mt-2 text-2xl font-bold tabular-nums font-mono"
        style={{ color: cell.color }}
      >
        {cell.ratioPercent}%
      </p>

      {/* Token count */}
      <p className="text-[11px] text-slate-500 mt-1">
        {cell.tokenCount.toLocaleString()} tokens
      </p>

      {/* Baseline indicator */}
      {isBaseline && (
        <span className="absolute top-2 right-2 text-[9px] uppercase tracking-wider text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">
          baseline
        </span>
      )}
    </div>
  );
}

function LanguageHeatmapInner({ data, language }: LanguageHeatmapProps) {
  if (data.length === 0) return null;

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-[11px] text-slate-400">
        <span className="text-slate-500 font-medium">
          Token ratio vs English (100% = baseline):
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: "#059669" }} />
          ≤110% Fair
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: "#10b981" }} />
          ≤150%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: "#f59e0b" }} />
          ≤200%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: "#ef4444" }} />
          ≤300%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full" style={{ background: "#dc2626" }} />
          &gt;300% Severe
        </span>
      </div>

      {/* Language label */}
      <p className="text-xs text-slate-500 mb-3">
        Analyzing: <span className="text-slate-300 font-medium">{language.toUpperCase()}</span>
        {" "}— ratio formula: (tokens in {language}) ÷ (tokens in English) × 100
      </p>

      {/* Grid of cells */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {data.map((cell) => (
          <HeatmapCellCard key={cell.tokenizer} cell={cell} />
        ))}
      </div>
    </div>
  );
}

const LanguageHeatmap = memo(LanguageHeatmapInner);
export default LanguageHeatmap;
