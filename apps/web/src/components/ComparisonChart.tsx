/**
 * ComparisonChart — Bar chart comparing token counts across tokenizers.
 *
 * Why this visualization:
 * - Relative comparison reveals which tokenizers are more expensive
 * - Sorted by token count (descending) — most expensive leads
 * - Bar height directly encodes token count (no silent normalization)
 * - Color encodes confidence level (exact vs estimated)
 *
 * Why purely presentational:
 * - Accepts pre-sorted, pre-shaped data from transforms.ts
 * - No API calls, no store access, no computation in render
 * - Parent memoizes data via useMemo → referential stability
 */

import { memo, useCallback } from "react";
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
import { CHART_COLORS, getPricing, calculateCost, COST_DECIMAL_PLACES } from "@/lib/constants";

interface ComparisonChartProps {
  readonly data: readonly ChartDataPoint[];
  readonly height?: number;
}

interface TooltipPayloadEntry {
  payload: ChartDataPoint;
  value: number;
}

function TooltipRow({
  label,
  value,
  valueClass = "text-slate-200",
  sub,
}: {
  readonly label: string;
  readonly value: string;
  readonly valueClass?: string;
  readonly sub?: string;
}) {
  return (
    <div className="flex justify-between gap-6">
      <span className="text-slate-400">{label}</span>
      <span className="text-right">
        <span className={`font-mono font-semibold ${valueClass}`}>{value}</span>
        {sub != null && (
          <span className="block text-[10px] text-slate-500">{sub}</span>
        )}
      </span>
    </div>
  );
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
  const d = entry.payload;

  const pricing = getPricing(d.tokenizer);
  const cost = pricing ? calculateCost(d.tokenCount, pricing.costPerMToken) : null;

  return (
    <div className="rounded-lg bg-slate-900/95 px-4 py-3 shadow-xl border border-white/10 backdrop-blur-sm">
      <p className="text-sm font-semibold text-slate-200">{d.displayName}</p>
      <div className="mt-2 space-y-1 text-xs">
        <TooltipRow label="Token Count" value={d.tokenCount.toLocaleString()} />
        <TooltipRow label="Efficiency" value={d.efficiency.toFixed(4)} />
        <TooltipRow
          label="Confidence"
          value={d.confidence}
          valueClass={d.confidence === "EXACT" ? "text-emerald-400" : "text-amber-400"}
        />
        {cost !== null && (
          <TooltipRow
            label="Est. Cost"
            value={`$${cost.toFixed(COST_DECIMAL_PLACES)}`}
            sub={`$${pricing!.costPerMToken}/1M tokens`}
          />
        )}
      </div>
      <p className="mt-2 text-[10px] text-slate-600">
        Formula: tokens ÷ 1,000,000 × cost/M
      </p>
    </div>
  );
}

function getBarColor(confidence: string): string {
  return confidence === "EXACT" ? CHART_COLORS.exact : CHART_COLORS.estimated;
}

function ComparisonChartInner({ data, height = 320 }: ComparisonChartProps) {
  if (data.length === 0) return null;

  const formatTick = useCallback((v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(0)}k`;
    return String(v);
  }, []);

  return (
    <>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS.exact }} />
          Exact
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS.estimated }} />
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
            stroke={CHART_COLORS.grid}
            vertical={false}
          />
          <XAxis
            dataKey="displayName"
            tick={{ fill: CHART_COLORS.tick, fontSize: 11 }}
            axisLine={{ stroke: CHART_COLORS.axis }}
            tickLine={false}
            interval={0}
            angle={data.length > 3 ? -20 : 0}
            textAnchor={data.length > 3 ? "end" : "middle"}
            height={data.length > 3 ? 60 : 30}
          />
          <YAxis
            tick={{ fill: CHART_COLORS.tick, fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={55}
            tickFormatter={formatTick}
            label={{
              value: "Token Count",
              angle: -90,
              position: "insideLeft",
              offset: 10,
              style: { fill: "#64748b", fontSize: 10 },
            }}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />
          <Bar dataKey="tokenCount" radius={[4, 4, 0, 0]} maxBarSize={60}>
            {data.map((entry) => (
              <Cell key={entry.tokenizer} fill={getBarColor(entry.confidence)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </>
  );
}

const ComparisonChart = memo(ComparisonChartInner);
export default ComparisonChart;
