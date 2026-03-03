/**
 * TokenTax — Data Transforms
 *
 * Pure functions that transform API responses into chart-ready shapes.
 *
 * Why transforms are isolated:
 * - Computation must NOT happen inside render — expensive transforms
 *   called on every re-render waste CPU and cause jank
 * - Pure functions are trivially testable (input → output)
 * - Components stay purely presentational (accept data, render it)
 * - Memoization (useMemo) wraps these — referential stability prevents
 *   Recharts from re-mounting SVG DOM nodes unnecessarily
 *
 * Why sorting matters:
 * - Deterministic ordering ensures visual output is reproducible
 * - Sorting by token count (descending) puts the most expensive
 *   tokenizer first — the most critical information leads
 */

import type {
  TokenAnalysis,
  FairnessResult,
  ChartDataPoint,
} from "@/types";
import type {
  CostDataPoint,
  HeatmapCell,
  GaugeDataPoint,
  TreemapNode,
  ScatterDataPoint,
} from "@/types/visualization";
import {
  getPricing,
  calculateCost,
  COST_DECIMAL_PLACES,
  PRICING_SNAPSHOT_VERSION,
  getHeatmapColor,
  getFairnessThreshold,
  getLanguageFamily,
} from "@/lib/constants";

// ── Chart Data (sorted, deterministic) ─────────────────

export function toChartData(results: readonly TokenAnalysis[]): ChartDataPoint[] {
  return [...results]
    .sort((a, b) => b.token_count - a.token_count)
    .map((r) => ({
      tokenizer: r.tokenizer_name,
      displayName: r.tokenizer_name.replace(/_/g, " "),
      tokenCount: r.token_count,
      efficiency: r.efficiency_ratio,
      confidence: r.confidence,
    }));
}

// ── Cost Breakdown ─────────────────────────────────────

export function toCostData(results: readonly TokenAnalysis[]): CostDataPoint[] {
  return [...results]
    .map((r) => {
      const pricing = getPricing(r.tokenizer_name);
      const costPerMToken = pricing?.costPerMToken ?? 0;
      const estimatedCost = calculateCost(r.token_count, costPerMToken);
      return {
        tokenizer: r.tokenizer_name,
        displayName: pricing?.displayName ?? r.tokenizer_name.replace(/_/g, " "),
        tokenCount: r.token_count,
        costPerMToken,
        estimatedCost: Number(estimatedCost.toFixed(COST_DECIMAL_PLACES)),
        isLowest: false, // set below
        snapshotVersion: PRICING_SNAPSHOT_VERSION,
      };
    })
    .sort((a, b) => a.estimatedCost - b.estimatedCost)
    .map((item, idx) => ({
      ...item,
      isLowest: idx === 0 && item.estimatedCost > 0,
    }));
}

// ── Heatmap (language token ratios vs English baseline) ─

export function toHeatmapData(
  results: readonly TokenAnalysis[],
  language: string,
): HeatmapCell[] {
  // Find English baseline token count for each tokenizer
  // If no English result exists, use the result itself as baseline (ratio = 100%)
  return results.map((r) => {
    // The API returns results for the analyzed language, not English.
    // token_ratio from fairness is the meaningful metric here.
    // For the heatmap we show the actual token count and mark
    // the language relative to a hypothetical English baseline.
    // Since we only have one language per analysis, ratio is derived
    // from the fairness results or defaults to 100%.
    const ratioPercent = 100; // Default — overridden by caller with fairness data
    return {
      tokenizer: r.tokenizer_name,
      displayName: r.tokenizer_name.replace(/_/g, " "),
      language,
      tokenCount: r.token_count,
      ratioPercent,
      color: getHeatmapColor(ratioPercent),
    };
  });
}

export function enrichHeatmapWithFairness(
  cells: HeatmapCell[],
  fairness: readonly FairnessResult[],
): HeatmapCell[] {
  return cells.map((cell) => {
    const f = fairness.find((fr) => fr.tokenizer_name === cell.tokenizer);
    if (!f) return cell;
    const ratioPercent = Math.round(f.token_ratio);
    return {
      ...cell,
      ratioPercent,
      color: getHeatmapColor(ratioPercent),
    };
  });
}

// ── Fairness Gauge ─────────────────────────────────────

export function toGaugeData(fairness: readonly FairnessResult[]): GaugeDataPoint[] {
  return [...fairness]
    .sort((a, b) => a.fairness_score - b.fairness_score)
    .map((f) => {
      const score = Math.max(0, Math.min(100, f.fairness_score));
      const threshold = getFairnessThreshold(score);
      return {
        tokenizer: f.tokenizer_name,
        score,
        label: threshold.label,
        color: threshold.color,
        formulaVersion: f.formula_version,
        tokenRatio: f.token_ratio,
      };
    });
}

// ── Treemap ────────────────────────────────────────────

export function toTreemapData(
  results: readonly TokenAnalysis[],
  fairness: readonly FairnessResult[],
): TreemapNode[] {
  return results.map((r) => {
    const f = fairness.find((fr) => fr.tokenizer_name === r.tokenizer_name);
    const score = f?.fairness_score ?? 50;
    const threshold = getFairnessThreshold(score);
    return {
      name: r.tokenizer_name.replace(/_/g, " "),
      tokenCount: r.token_count,
      fairnessScore: score,
      color: threshold.color,
      language: r.language,
    };
  });
}

// ── Scatter Plot ───────────────────────────────────────

export function toScatterData(
  results: readonly TokenAnalysis[],
  fairness: readonly FairnessResult[],
): ScatterDataPoint[] {
  return results.map((r) => {
    const f = fairness.find((fr) => fr.tokenizer_name === r.tokenizer_name);
    return {
      tokenizer: r.tokenizer_name.replace(/_/g, " "),
      language: r.language,
      languageFamily: getLanguageFamily(r.language),
      tokenRatio: f?.token_ratio ?? 100,
      fairnessScore: f?.fairness_score ?? 50,
    };
  });
}
