/**
 * ComparisonChart — Bar chart comparing token counts across tokenizers.
 *
 * Boundary rationale:
 * - Purely presentational: accepts pre-shaped data, renders a chart.
 * - Does NOT call APIs or compute data — parent transforms API response.
 * - Separated from ResultsPanel: charts serve pattern recognition,
 *   tables serve precision lookup. Different cognitive purposes.
 *
 * Why Recharts over D3:
 * - Recharts is React-native (JSX components, not imperative DOM manipulation)
 * - D3 requires manual lifecycle management that fights React's model
 * - Recharts has built-in responsive containers and tooltips
 * - For bar/line charts, Recharts achieves 90% of D3's output with 10% of code
 * - D3 is appropriate when you need custom force graphs or geographic maps
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { ChartDataPoint } from "@/types";

interface ComparisonChartProps {
  /** Pre-shaped data points for the chart. */
  readonly data: readonly ChartDataPoint[];
  /** Chart height in pixels. */
  readonly height?: number;
}

/** Color map: EXACT tokenizers get brand blue, ESTIMATED gets amber. */
function getBarColor(confidence: string): string {
  return confidence === "EXACT" ? "#6366f1" : "#f59e0b";
}

interface TooltipPayloadEntry {
  payload: ChartDataPoint;
  value: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  readonly active?: boolean;
  readonly payload?: readonly TooltipPayloadEntry[];
}) {
  if (!active || !payload?.length) return null;

  const entry = payload[0];
  if (!entry) return null;
  const data = entry.payload;

  return (
    <div className="glass rounded-lg px-4 py-3 shadow-xl border border-white/10">
      <p className="text-sm font-semibold text-slate-200">
        {data.displayName}
      </p>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between gap-6">
          <span className="text-slate-400">Token Count</span>
          <span className="font-mono font-semibold text-slate-200">
            {data.tokenCount.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-slate-400">Efficiency</span>
          <span className="font-mono text-slate-300">
            {data.efficiency.toFixed(4)}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-slate-400">Confidence</span>
          <span
            className={
              data.confidence === "EXACT"
                ? "text-emerald-400"
                : "text-amber-400"
            }
          >
            {data.confidence}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function ComparisonChart({
  data,
  height = 320,
}: ComparisonChartProps) {
  if (data.length === 0) return null;

  return (
    <div className="glass rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-200">
          Token Count Comparison
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Tokens produced by each tokenizer for the same input
        </p>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-brand-500" />
          Exact
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-amber-500" />
          Estimated
        </span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data as ChartDataPoint[]}
          margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="tokenizer"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={50}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar dataKey="tokenCount" radius={[4, 4, 0, 0]} maxBarSize={60}>
            {data.map((entry) => (
              <Cell
                key={entry.tokenizer}
                fill={getBarColor(entry.confidence)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
