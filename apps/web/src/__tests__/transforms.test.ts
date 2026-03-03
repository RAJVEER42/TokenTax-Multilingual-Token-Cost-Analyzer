/**
 * Transform Functions Tests — Phase 6
 *
 * Validates:
 * - toChartData: sorts descending, maps fields correctly
 * - toCostData: pricing lookup, isLowest flag, decimal precision
 * - toHeatmapData + enrichHeatmapWithFairness: ratio computation, color mapping
 * - toGaugeData: clamping, threshold labels, sorting
 * - toTreemapData: fairness color, language propagation
 * - toScatterData: language family grouping
 * - Edge cases: empty arrays, zero tokens, extreme ratios
 */

import { describe, it, expect } from "vitest";
import {
  toChartData,
  toCostData,
  toHeatmapData,
  enrichHeatmapWithFairness,
  toGaugeData,
  toTreemapData,
  toScatterData,
} from "@/lib/transforms";
import type { TokenAnalysis, FairnessResult } from "@/types";

// ── Test Fixtures ──────────────────────────────────────

const mockResults: TokenAnalysis[] = [
  {
    tokenizer_name: "tiktoken",
    tokenizer_version: "0.7.0",
    token_count: 100,
    char_count: 500,
    efficiency_ratio: 5.0,
    confidence: "EXACT",
    language: "zh",
    error: null,
  },
  {
    tokenizer_name: "sentencepiece",
    tokenizer_version: "1.0.0",
    token_count: 200,
    char_count: 500,
    efficiency_ratio: 2.5,
    confidence: "EXACT",
    language: "zh",
    error: null,
  },
  {
    tokenizer_name: "claude",
    tokenizer_version: "1.0.0",
    token_count: 150,
    char_count: 500,
    efficiency_ratio: 3.33,
    confidence: "ESTIMATED",
    language: "zh",
    error: null,
  },
];

const mockFairness: FairnessResult[] = [
  {
    tokenizer_name: "tiktoken",
    fairness_score: 85,
    token_ratio: 120,
    formula_version: "1.0",
  },
  {
    tokenizer_name: "sentencepiece",
    fairness_score: 45,
    token_ratio: 250,
    formula_version: "1.0",
  },
  {
    tokenizer_name: "claude",
    fairness_score: 20,
    token_ratio: 350,
    formula_version: "1.0",
  },
];

// ── toChartData ────────────────────────────────────────

describe("toChartData", () => {
  it("sorts results by token count descending", () => {
    const chart = toChartData(mockResults);
    expect(chart[0]!.tokenCount).toBe(200);
    expect(chart[1]!.tokenCount).toBe(150);
    expect(chart[2]!.tokenCount).toBe(100);
  });

  it("maps fields correctly", () => {
    const chart = toChartData(mockResults);
    const first = chart[0]!;
    expect(first.tokenizer).toBe("sentencepiece");
    expect(first.displayName).toBe("sentencepiece");
    expect(first.efficiency).toBe(2.5);
    expect(first.confidence).toBe("EXACT");
  });

  it("replaces underscores with spaces in displayName", () => {
    const results: TokenAnalysis[] = [
      {
        tokenizer_name: "my_custom_tokenizer",
        tokenizer_version: "1.0",
        token_count: 50,
        char_count: 100,
        efficiency_ratio: 2,
        confidence: "ESTIMATED",
        language: "en",
        error: null,
      },
    ];
    const chart = toChartData(results);
    expect(chart[0]!.displayName).toBe("my custom tokenizer");
  });

  it("returns empty array for empty input", () => {
    expect(toChartData([])).toEqual([]);
  });

  it("does not mutate the original array", () => {
    const original = [...mockResults];
    toChartData(mockResults);
    expect(mockResults).toEqual(original);
  });
});

// ── toCostData ─────────────────────────────────────────

describe("toCostData", () => {
  it("computes estimated cost correctly", () => {
    const costs = toCostData(mockResults);
    // tiktoken: 100 tokens at $2.50/M = $0.000250
    const tiktoken = costs.find((c) => c.tokenizer === "tiktoken");
    expect(tiktoken).toBeDefined();
    expect(tiktoken!.estimatedCost).toBeCloseTo(0.00025, 6);
  });

  it("sorts by estimated cost ascending", () => {
    const costs = toCostData(mockResults);
    for (let i = 1; i < costs.length; i++) {
      expect(costs[i]!.estimatedCost).toBeGreaterThanOrEqual(costs[i - 1]!.estimatedCost);
    }
  });

  it("marks the lowest cost entry", () => {
    const costs = toCostData(mockResults);
    const lowest = costs.filter((c) => c.isLowest);
    expect(lowest).toHaveLength(1);
    expect(lowest[0]!.estimatedCost).toBeLessThanOrEqual(costs[1]!.estimatedCost);
  });

  it("uses display name from pricing lookup", () => {
    const costs = toCostData(mockResults);
    const tiktoken = costs.find((c) => c.tokenizer === "tiktoken");
    expect(tiktoken!.displayName).toBe("GPT-4o (TikToken)");
  });

  it("includes snapshot version", () => {
    const costs = toCostData(mockResults);
    for (const c of costs) {
      expect(c.snapshotVersion).toBeTruthy();
      expect(c.snapshotVersion).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("returns empty array for empty input", () => {
    expect(toCostData([])).toEqual([]);
  });

  it("handles unknown tokenizer with zero cost", () => {
    const results: TokenAnalysis[] = [
      {
        tokenizer_name: "unknown",
        tokenizer_version: "1.0",
        token_count: 1000,
        char_count: 5000,
        efficiency_ratio: 5,
        confidence: "ESTIMATED",
        language: "en",
        error: null,
      },
    ];
    const costs = toCostData(results);
    expect(costs[0]!.costPerMToken).toBe(0);
    expect(costs[0]!.estimatedCost).toBe(0);
    // isLowest should be false when cost is 0
    expect(costs[0]!.isLowest).toBe(false);
  });
});

// ── toHeatmapData + enrichHeatmapWithFairness ──────────

describe("toHeatmapData", () => {
  it("creates heatmap cells for each result", () => {
    const cells = toHeatmapData(mockResults, "zh");
    expect(cells).toHaveLength(3);
  });

  it("sets language from parameter", () => {
    const cells = toHeatmapData(mockResults, "ja");
    for (const cell of cells) {
      expect(cell.language).toBe("ja");
    }
  });

  it("defaults ratioPercent to 100", () => {
    const cells = toHeatmapData(mockResults, "zh");
    for (const cell of cells) {
      expect(cell.ratioPercent).toBe(100);
    }
  });

  it("returns empty array for empty input", () => {
    expect(toHeatmapData([], "en")).toEqual([]);
  });
});

describe("enrichHeatmapWithFairness", () => {
  it("updates ratioPercent from fairness data", () => {
    const cells = toHeatmapData(mockResults, "zh");
    const enriched = enrichHeatmapWithFairness(cells, mockFairness);
    const tiktoken = enriched.find((c) => c.tokenizer === "tiktoken");
    expect(tiktoken!.ratioPercent).toBe(120);
  });

  it("updates color based on new ratio", () => {
    const cells = toHeatmapData(mockResults, "zh");
    const enriched = enrichHeatmapWithFairness(cells, mockFairness);
    const claude = enriched.find((c) => c.tokenizer === "claude");
    // Claude has ratio 350 → severe (>300)
    expect(claude!.color).toBe("#dc2626");
  });

  it("leaves cells unchanged when no matching fairness", () => {
    const cells = toHeatmapData(mockResults, "zh");
    const enriched = enrichHeatmapWithFairness(cells, []);
    for (const cell of enriched) {
      expect(cell.ratioPercent).toBe(100);
    }
  });
});

// ── toGaugeData ────────────────────────────────────────

describe("toGaugeData", () => {
  it("sorts by fairness score ascending", () => {
    const gauges = toGaugeData(mockFairness);
    expect(gauges[0]!.score).toBe(20);
    expect(gauges[1]!.score).toBe(45);
    expect(gauges[2]!.score).toBe(85);
  });

  it("assigns correct threshold labels", () => {
    const gauges = toGaugeData(mockFairness);
    const biased = gauges.find((g) => g.score === 20);
    const moderate = gauges.find((g) => g.score === 45);
    const fair = gauges.find((g) => g.score === 85);
    expect(biased!.label).toBe("Biased");
    expect(moderate!.label).toBe("Moderate");
    expect(fair!.label).toBe("Fair");
  });

  it("clamps scores to 0-100", () => {
    const extreme: FairnessResult[] = [
      {
        tokenizer_name: "low",
        fairness_score: -20,
        token_ratio: 500,
        formula_version: "1.0",
      },
      {
        tokenizer_name: "high",
        fairness_score: 150,
        token_ratio: 80,
        formula_version: "1.0",
      },
    ];
    const gauges = toGaugeData(extreme);
    expect(gauges[0]!.score).toBe(0);
    expect(gauges[1]!.score).toBe(100);
  });

  it("includes formula version and token ratio", () => {
    const gauges = toGaugeData(mockFairness);
    expect(gauges[0]!.formulaVersion).toBe("1.0");
    expect(gauges[0]!.tokenRatio).toBe(350);
  });

  it("returns empty array for empty input", () => {
    expect(toGaugeData([])).toEqual([]);
  });
});

// ── toTreemapData ──────────────────────────────────────

describe("toTreemapData", () => {
  it("creates nodes for each result", () => {
    const nodes = toTreemapData(mockResults, mockFairness);
    expect(nodes).toHaveLength(3);
  });

  it("maps token count correctly", () => {
    const nodes = toTreemapData(mockResults, mockFairness);
    const sentencepiece = nodes.find((n) => n.name === "sentencepiece");
    expect(sentencepiece!.tokenCount).toBe(200);
  });

  it("uses fairness score for color", () => {
    const nodes = toTreemapData(mockResults, mockFairness);
    const tiktoken = nodes.find((n) => n.name === "tiktoken");
    // Score 85 → Fair → green
    expect(tiktoken!.fairnessScore).toBe(85);
    expect(tiktoken!.color).toBe("#059669");
  });

  it("defaults to score 50 when no fairness match", () => {
    const nodes = toTreemapData(mockResults, []);
    for (const node of nodes) {
      expect(node.fairnessScore).toBe(50);
    }
  });

  it("propagates language", () => {
    const nodes = toTreemapData(mockResults, mockFairness);
    for (const node of nodes) {
      expect(node.language).toBe("zh");
    }
  });

  it("returns empty array for empty results", () => {
    expect(toTreemapData([], [])).toEqual([]);
  });
});

// ── toScatterData ──────────────────────────────────────

describe("toScatterData", () => {
  it("creates data points for each result", () => {
    const scatter = toScatterData(mockResults, mockFairness);
    expect(scatter).toHaveLength(3);
  });

  it("assigns correct language family", () => {
    const scatter = toScatterData(mockResults, mockFairness);
    // All results are "zh" → "Sino-Tibetan"
    for (const point of scatter) {
      expect(point.languageFamily).toBe("Sino-Tibetan");
    }
  });

  it("uses fairness token ratio", () => {
    const scatter = toScatterData(mockResults, mockFairness);
    const tiktoken = scatter.find((s) => s.tokenizer === "tiktoken");
    expect(tiktoken!.tokenRatio).toBe(120);
  });

  it("defaults to ratio 100 and score 50 when no fairness match", () => {
    const scatter = toScatterData(mockResults, []);
    for (const point of scatter) {
      expect(point.tokenRatio).toBe(100);
      expect(point.fairnessScore).toBe(50);
    }
  });

  it("returns Other for unknown language", () => {
    const results: TokenAnalysis[] = [
      {
        tokenizer_name: "tiktoken",
        tokenizer_version: "0.7.0",
        token_count: 100,
        char_count: 500,
        efficiency_ratio: 5,
        confidence: "EXACT",
        language: "xx",
        error: null,
      },
    ];
    const scatter = toScatterData(results, []);
    expect(scatter[0]!.languageFamily).toBe("Other");
  });

  it("returns empty array for empty input", () => {
    expect(toScatterData([], [])).toEqual([]);
  });

  it("replaces underscores in tokenizer name", () => {
    const results: TokenAnalysis[] = [
      {
        tokenizer_name: "my_tokenizer",
        tokenizer_version: "1.0",
        token_count: 50,
        char_count: 100,
        efficiency_ratio: 2,
        confidence: "ESTIMATED",
        language: "en",
        error: null,
      },
    ];
    const scatter = toScatterData(results, []);
    expect(scatter[0]!.tokenizer).toBe("my tokenizer");
  });
});

// ── Edge Cases ─────────────────────────────────────────

describe("Edge cases", () => {
  it("handles zero token count in toChartData", () => {
    const results: TokenAnalysis[] = [
      {
        tokenizer_name: "zero",
        tokenizer_version: "1.0",
        token_count: 0,
        char_count: 0,
        efficiency_ratio: 0,
        confidence: "ESTIMATED",
        language: "en",
        error: null,
      },
    ];
    const chart = toChartData(results);
    expect(chart).toHaveLength(1);
    expect(chart[0]!.tokenCount).toBe(0);
  });

  it("handles zero token count in toCostData", () => {
    const results: TokenAnalysis[] = [
      {
        tokenizer_name: "tiktoken",
        tokenizer_version: "1.0",
        token_count: 0,
        char_count: 0,
        efficiency_ratio: 0,
        confidence: "EXACT",
        language: "en",
        error: null,
      },
    ];
    const costs = toCostData(results);
    expect(costs[0]!.estimatedCost).toBe(0);
    expect(costs[0]!.isLowest).toBe(false);
  });

  it("single result sets isLowest correctly", () => {
    const results: TokenAnalysis[] = [
      {
        tokenizer_name: "tiktoken",
        tokenizer_version: "1.0",
        token_count: 100,
        char_count: 500,
        efficiency_ratio: 5,
        confidence: "EXACT",
        language: "en",
        error: null,
      },
    ];
    const costs = toCostData(results);
    expect(costs).toHaveLength(1);
    expect(costs[0]!.isLowest).toBe(true);
  });
});
