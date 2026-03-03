/**
 * CostBreakdown — Estimated cost comparison table.
 *
 * Why table format:
 * - Precise numeric comparisons need tabular alignment, not area/color encoding
 * - Lowest-cost tokenizer is highlighted — actionable insight
 * - Pricing snapshot version is shown — users know data currency
 *
 * Why purely presentational:
 * - Accepts pre-computed CostDataPoint[] from transforms.ts
 * - No store access, no API calls, no computation in render
 *
 * Why decimal precision matters:
 * - Token cost at scale is fractional — $0.000250 vs $0.000020
 * - Consistent COST_DECIMAL_PLACES across all displays
 */

import { memo, useState } from "react";
import { Info, TrendingDown } from "lucide-react";
import type { CostDataPoint } from "@/types/visualization";
import { COST_DECIMAL_PLACES } from "@/lib/constants";

interface CostBreakdownProps {
  readonly data: readonly CostDataPoint[];
}

function CostBreakdownInner({ data }: CostBreakdownProps) {
  const [showFormula, setShowFormula] = useState(false);

  if (data.length === 0) return null;

  const snapshotVersion = data[0]?.snapshotVersion ?? "unknown";

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <p className="text-xs text-slate-500">
            Pricing snapshot: <span className="text-slate-400 font-mono">{snapshotVersion}</span>
          </p>
          <button
            type="button"
            className="text-slate-500 hover:text-slate-300 transition-colors"
            aria-label="Cost formula information"
            onClick={() => setShowFormula((p) => !p)}
          >
            <Info className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Formula tooltip */}
      {showFormula && (
        <div
          className="mb-3 rounded-lg bg-slate-900/80 p-3 text-xs text-slate-400 border border-white/10"
          role="tooltip"
        >
          <p className="font-semibold text-slate-300 mb-1">Cost Formula</p>
          <p className="font-mono text-[11px]">
            estimatedCost = (tokenCount ÷ 1,000,000) × costPerMToken
          </p>
          <p className="mt-1 text-slate-500">
            Costs are estimates based on published pricing. Actual costs
            may vary by provider tier, region, and contract.
          </p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500 uppercase tracking-wider border-b border-white/6">
              <th className="text-left py-2 pr-4 font-medium">Tokenizer</th>
              <th className="text-right py-2 px-4 font-medium">Tokens</th>
              <th className="text-right py-2 px-4 font-medium">$/1M Tokens</th>
              <th className="text-right py-2 pl-4 font-medium">Est. Cost</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.tokenizer}
                className={`border-b border-white/4 transition-colors ${
                  row.isLowest
                    ? "bg-emerald-500/5"
                    : "hover:bg-white/3"
                }`}
              >
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    {row.isLowest && (
                      <TrendingDown className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    )}
                    <span className={`text-sm ${row.isLowest ? "text-emerald-300 font-semibold" : "text-slate-300"}`}>
                      {row.displayName}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-300 tabular-nums">
                  {row.tokenCount.toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-400 tabular-nums">
                  ${row.costPerMToken.toFixed(2)}
                </td>
                <td className="py-3 pl-4 text-right">
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      row.isLowest ? "text-emerald-400" : "text-slate-200"
                    }`}
                  >
                    ${row.estimatedCost.toFixed(COST_DECIMAL_PLACES)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Disclaimer */}
      <p className="mt-3 text-[10px] text-slate-600">
        Costs are estimates. Actual pricing depends on provider, tier, and usage volume.
      </p>
    </div>
  );
}

const CostBreakdown = memo(CostBreakdownInner);
export default CostBreakdown;
