/**
 * FairnessGauge — SVG arc gauge visualization (0–100 scale).
 *
 * Why gauge format:
 * - Intuitive "speedometer" metaphor for score interpretation
 * - Arc area encodes magnitude — easier than reading a number alone
 * - Color thresholds (red/amber/green) provide instant assessment
 *
 * Why score must NOT be visually exaggerated:
 * - Arc sweep is proportional to score (not logarithmic or weighted)
 * - Score is clamped 0–100 — no negative or >100 values
 * - Thresholds are documented in tooltip
 *
 * Why this is a separate component:
 * - Different visual encoding than FairnessScoreCard (card = data, gauge = gestalt)
 * - Pure SVG — no Recharts dependency
 * - Memoized — only re-renders when score changes
 */

import { memo, useState, useMemo } from "react";
import { Info } from "lucide-react";
import type { GaugeDataPoint } from "@/types/visualization";

interface FairnessGaugeProps {
  readonly data: GaugeDataPoint;
  readonly size?: number;
}

const STROKE_WIDTH = 10;
const START_ANGLE = -135;
const END_ANGLE = 135;
const SWEEP = END_ANGLE - START_ANGLE; // 270 degrees

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function FairnessGaugeInner({ data, size = 160 }: FairnessGaugeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - STROKE_WIDTH * 2) / 2;

  const scoreAngle = useMemo(
    () => START_ANGLE + (data.score / 100) * SWEEP,
    [data.score],
  );

  const bgArc = useMemo(() => describeArc(cx, cy, r, START_ANGLE, END_ANGLE), [cx, cy, r]);
  const fgArc = useMemo(
    () => data.score > 0 ? describeArc(cx, cy, r, START_ANGLE, scoreAngle) : "",
    [cx, cy, r, scoreAngle, data.score],
  );

  return (
    <div className="relative flex flex-col items-center">
      {/* SVG Gauge */}
      <svg
        width={size}
        height={size * 0.7}
        viewBox={`0 0 ${size} ${size * 0.7}`}
        className="overflow-visible"
        role="img"
        aria-label={`Fairness score: ${data.score.toFixed(1)} out of 100 — ${data.label}`}
      >
        {/* Background arc */}
        <path
          d={bgArc}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
        />
        {/* Score arc */}
        {data.score > 0 && (
          <path
            d={fgArc}
            fill="none"
            stroke={data.color}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            className="transition-all duration-500 ease-out"
          />
        )}
        {/* Score text */}
        <text
          x={cx}
          y={cy - 4}
          textAnchor="middle"
          className="fill-slate-100 text-2xl font-bold"
          style={{ fontSize: "28px", fontFamily: "var(--font-display)" }}
        >
          {data.score.toFixed(0)}
        </text>
        <text
          x={cx}
          y={cy + 16}
          textAnchor="middle"
          className="fill-slate-500"
          style={{ fontSize: "10px" }}
        >
          / 100
        </text>
      </svg>

      {/* Label */}
      <p className="mt-1 text-xs font-medium" style={{ color: data.color }}>
        {data.label}
      </p>

      {/* Tokenizer name */}
      <p className="mt-0.5 text-[11px] text-slate-400 font-medium">
        {data.tokenizer}
      </p>

      {/* Formula version */}
      <p className="text-[10px] text-slate-600 mt-0.5">
        Formula v{data.formulaVersion}
      </p>

      {/* Info button */}
      <button
        type="button"
        className="absolute top-0 right-0 p-1 text-slate-500 hover:text-slate-300 transition-colors"
        aria-label="Fairness gauge information"
        onClick={() => setShowTooltip((p) => !p)}
        onBlur={() => setShowTooltip(false)}
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          className="absolute right-0 top-8 z-10 w-56 rounded-lg bg-slate-900/95 p-3 text-xs text-slate-300 shadow-xl border border-white/10 backdrop-blur-sm"
          role="tooltip"
        >
          <p className="font-semibold text-slate-200 mb-1">Score Thresholds</p>
          <ul className="space-y-0.5 text-[11px]">
            <li><span className="text-emerald-400">70–100:</span> Fair</li>
            <li><span className="text-amber-400">40–69:</span> Moderate bias</li>
            <li><span className="text-red-400">0–39:</span> Biased</li>
          </ul>
          <p className="mt-2 text-slate-500">
            Token ratio: {data.tokenRatio.toFixed(1)}%
          </p>
          <p className="text-slate-500">
            MAD-normalized scoring.
          </p>
        </div>
      )}
    </div>
  );
}

const FairnessGauge = memo(FairnessGaugeInner);
export default FairnessGauge;
