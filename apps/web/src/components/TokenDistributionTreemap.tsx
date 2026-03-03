/**
 * TokenDistributionTreemap — Treemap visualization of token distribution.
 *
 * Why treemap:
 * - Area encodes relative token count — largest consumer is instantly visible
 * - Color encodes fairness score — combines two dimensions in one view
 * - Compact layout works well for 4–8 tokenizers
 *
 * Why separate from ComparisonChart:
 * - Bar chart shows absolute counts; treemap shows proportional distribution
 * - Different cognitive tasks: comparison vs composition
 *
 * Why purely presentational:
 * - Accepts pre-computed TreemapNode[] from transforms.ts
 * - No store access, no API calls, no computation in render
 */

import { memo, useCallback } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import type { TreemapNode } from "@/types/visualization";
import { CHART_COLORS } from "@/lib/constants";

interface TokenDistributionTreemapProps {
  readonly data: readonly TreemapNode[];
  readonly height?: number;
}

interface TreemapContentProps {
  readonly x?: number;
  readonly y?: number;
  readonly width?: number;
  readonly height?: number;
  readonly name?: string;
  readonly tokenCount?: number;
  readonly color?: string;
  readonly fairnessScore?: number;
}

function CustomTreemapContent({
  x = 0,
  y = 0,
  width = 0,
  height: h = 0,
  name = "",
  tokenCount = 0,
  color = CHART_COLORS.exact,
  fairnessScore = 50,
}: TreemapContentProps) {
  const showLabel = width > 60 && h > 40;
  const showCount = width > 80 && h > 55;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={h}
        rx={4}
        fill={color}
        fillOpacity={0.25}
        stroke={color}
        strokeWidth={1.5}
        strokeOpacity={0.5}
        className="transition-all duration-200"
      />
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + h / 2 - (showCount ? 8 : 0)}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-200"
          style={{ fontSize: Math.min(12, width / 8), fontWeight: 600 }}
        >
          {name}
        </text>
      )}
      {showCount && (
        <text
          x={x + width / 2}
          y={y + h / 2 + 10}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-400"
          style={{ fontSize: Math.min(10, width / 10) }}
        >
          {tokenCount.toLocaleString()} · {fairnessScore.toFixed(0)}%
        </text>
      )}
    </g>
  );
}

interface TreemapTooltipPayload {
  payload: TreemapNode;
}

function CustomTooltip({
  active,
  payload,
}: {
  readonly active?: boolean;
  readonly payload?: readonly TreemapTooltipPayload[];
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  if (!entry) return null;
  const d = entry.payload;

  return (
    <div className="rounded-lg bg-slate-900/95 px-4 py-3 shadow-xl border border-white/10 backdrop-blur-sm">
      <p className="text-sm font-semibold text-slate-200">{d.name}</p>
      <div className="mt-2 space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Tokens</span>
          <span className="font-mono font-semibold text-slate-200">
            {d.tokenCount.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Fairness</span>
          <span
            className="font-mono font-semibold"
            style={{ color: d.color }}
          >
            {d.fairnessScore.toFixed(1)}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-slate-400">Language</span>
          <span className="text-slate-300">{d.language.toUpperCase()}</span>
        </div>
      </div>
    </div>
  );
}

function TokenDistributionTreemapInner({
  data,
  height = 280,
}: TokenDistributionTreemapProps) {
  if (data.length === 0) return null;

  const renderContent = useCallback(
    (props: TreemapContentProps) => <CustomTreemapContent {...props} />,
    [],
  );

  // Recharts Treemap requires mutable data with `size` key
  const treemapData = data.map((d) => ({
    ...d,
    size: d.tokenCount,
  }));

  return (
    <div>
      {/* Legend */}
      <div className="flex items-center gap-4 mb-4 text-[11px] text-slate-400">
        <span>Area = token count</span>
        <span className="text-slate-600">·</span>
        <span>Color = fairness score threshold</span>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <Treemap
          data={treemapData}
          dataKey="size"
          stroke="rgba(255,255,255,0.06)"
          content={renderContent}
          isAnimationActive={false}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}

const TokenDistributionTreemap = memo(TokenDistributionTreemapInner);
export default TokenDistributionTreemap;
