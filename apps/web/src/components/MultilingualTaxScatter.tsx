/**
 * MultilingualTaxScatter — Scatter plot of token ratio vs fairness score.
 *
 * Why scatter plot:
 * - Reveals correlation (or lack thereof) between token ratio and fairness
 * - Language family grouping shows systematic bias patterns
 * - Diagonal reference line (ratio=100%) anchors visual interpretation
 *
 * Why language families:
 * - Script complexity drives tokenization cost — CJK, Indic, Arabic cluster differently
 * - Grouping by family reveals structural patterns, not random noise
 *
 * Why purely presentational:
 * - Accepts pre-computed ScatterDataPoint[] from transforms.ts
 * - No store access, no API calls, no computation in render
 */

import { memo, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ScatterDataPoint } from "@/types/visualization";
import { CHART_COLORS } from "@/lib/constants";

interface MultilingualTaxScatterProps {
  readonly data: readonly ScatterDataPoint[];
  readonly height?: number;
}

/** Color palette for language family clusters. */
const FAMILY_COLORS: Readonly<Record<string, string>> = {
  Germanic: "#6366f1",
  Romance: "#ec4899",
  "Sino-Tibetan": "#f59e0b",
  Japonic: "#ef4444",
  Koreanic: "#f97316",
  "Afro-Asiatic": "#14b8a6",
  "Indo-Aryan": "#8b5cf6",
  Dravidian: "#06b6d4",
  "Tai-Kadai": "#84cc16",
  Austroasiatic: "#22d3ee",
  Slavic: "#a78bfa",
  Turkic: "#fb923c",
  "Niger-Congo": "#34d399",
  Other: "#94a3b8",
} as const;

function getFamilyColor(family: string): string {
  return FAMILY_COLORS[family] ?? FAMILY_COLORS["Other"]!;
}

interface ScatterTooltipPayload {
  payload: ScatterDataPoint;
}

function CustomTooltip({
  active,
  payload,
}: {
  readonly active?: boolean;
  readonly payload?: readonly ScatterTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  const d = entry.payload;

  return (
    <div className="rounded-lg bg-slate-900/95 px-4 py-3 shadow-xl border border-white/10 backdrop-blur-sm">
      <p className="text-sm font-semibold text-slate-200">{d.tokenizer}</p>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Language</span>
          <span className="text-slate-300">{d.language.toUpperCase()}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Family</span>
          <span style={{ color: getFamilyColor(d.languageFamily) }}>
            {d.languageFamily}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Token Ratio</span>
          <span className="font-mono font-semibold text-slate-200">
            {d.tokenRatio.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Fairness</span>
          <span className="font-mono font-semibold text-slate-200">
            {d.fairnessScore.toFixed(1)}
          </span>
        </div>
      </div>
      <p className="mt-2 text-[10px] text-slate-600">
        100% ratio = same as English baseline
      </p>
    </div>
  );
}

function MultilingualTaxScatterInner({
  data,
  height = 320,
}: MultilingualTaxScatterProps) {
  if (data.length === 0) return null;

  // Group data by language family for separate Scatter series
  const groupedByFamily = useMemo(() => {
    const map = new Map<string, ScatterDataPoint[]>();
    for (const point of data) {
      const existing = map.get(point.languageFamily);
      if (existing) {
        existing.push(point);
      } else {
        map.set(point.languageFamily, [point]);
      }
    }
    return map;
  }, [data]);

  // Collect unique families for legend
  const families = useMemo(() => [...groupedByFamily.keys()].sort(), [groupedByFamily]);

  return (
    <div>
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-3 mb-4 text-[11px] text-slate-400">
        {families.map((family) => (
          <span key={family} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: getFamilyColor(family) }}
            />
            {family}
          </span>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={CHART_COLORS.grid}
          />
          <XAxis
            type="number"
            dataKey="tokenRatio"
            name="Token Ratio"
            unit="%"
            tick={{ fill: CHART_COLORS.tick, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.axis }}
            tickLine={false}
            label={{
              value: "Token Ratio (%)",
              position: "insideBottom",
              offset: -4,
              style: { fill: "#64748b", fontSize: 10 },
            }}
          />
          <YAxis
            type="number"
            dataKey="fairnessScore"
            name="Fairness"
            tick={{ fill: CHART_COLORS.tick, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={45}
            label={{
              value: "Fairness Score",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              style: { fill: "#64748b", fontSize: 10 },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          {/* Reference line at 100% ratio (English baseline) */}
          <ReferenceLine
            x={100}
            stroke="rgba(255,255,255,0.15)"
            strokeDasharray="4 4"
            label={{
              value: "English baseline",
              position: "top",
              style: { fill: "#64748b", fontSize: 9 },
            }}
          />
          {/* Scatter series per family */}
          {families.map((family) => (
            <Scatter
              key={family}
              name={family}
              data={groupedByFamily.get(family) ?? []}
              fill={getFamilyColor(family)}
              fillOpacity={0.8}
              r={6}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Explanation */}
      <p className="mt-3 text-[10px] text-slate-600">
        Each dot represents one tokenizer analyzing this text. X-axis shows token ratio vs English (100% = parity).
        Higher Y-axis = fairer scoring. Dots far right indicate the "multilingual tax."
      </p>
    </div>
  );
}

const MultilingualTaxScatter = memo(MultilingualTaxScatterInner);
export default MultilingualTaxScatter;
