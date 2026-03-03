/**
 * Constants Tests — Phase 6
 *
 * Validates:
 * - getPricing returns correct TokenizerPricing for each tokenizer
 * - getPricing returns null for unknown tokenizers
 * - calculateCost computes correct fractional costs
 * - calculateCost handles zero tokens and zero cost
 * - getFairnessThreshold returns correct tier for boundary values
 * - getHeatmapColor returns correct color for boundary ratios
 * - getLanguageFamily returns correct family or "Other"
 * - FAIRNESS_THRESHOLDS are sorted descending by min
 * - TOKENIZER_PRICING has no duplicate names
 */

import { describe, it, expect } from "vitest";
import {
  getPricing,
  calculateCost,
  COST_DECIMAL_PLACES,
  PRICING_SNAPSHOT_VERSION,
  TOKENIZER_PRICING,
  getFairnessThreshold,
  FAIRNESS_THRESHOLDS,
  getHeatmapColor,
  HEATMAP_COLORS,
  getLanguageFamily,
  LANGUAGE_FAMILIES,
  CHART_COLORS,
} from "@/lib/constants";

// ── getPricing ─────────────────────────────────────────

describe("getPricing", () => {
  it("returns pricing for tiktoken", () => {
    const p = getPricing("tiktoken");
    expect(p).not.toBeNull();
    expect(p!.name).toBe("tiktoken");
    expect(p!.costPerMToken).toBe(2.5);
  });

  it("returns pricing for sentencepiece", () => {
    const p = getPricing("sentencepiece");
    expect(p).not.toBeNull();
    expect(p!.name).toBe("sentencepiece");
    expect(p!.costPerMToken).toBe(0.2);
  });

  it("returns pricing for claude", () => {
    const p = getPricing("claude");
    expect(p).not.toBeNull();
    expect(p!.costPerMToken).toBe(3.0);
  });

  it("returns pricing for huggingface", () => {
    const p = getPricing("huggingface");
    expect(p).not.toBeNull();
    expect(p!.costPerMToken).toBe(0.1);
  });

  it("matches tokenizer names containing the pricing name", () => {
    const p = getPricing("my_tiktoken_v2");
    expect(p).not.toBeNull();
    expect(p!.name).toBe("tiktoken");
  });

  it("returns null for unknown tokenizer", () => {
    expect(getPricing("unknown_tokenizer")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(getPricing("")).toBeNull();
  });
});

// ── calculateCost ──────────────────────────────────────

describe("calculateCost", () => {
  it("computes cost for 1M tokens at $2.50/M", () => {
    expect(calculateCost(1_000_000, 2.5)).toBe(2.5);
  });

  it("computes cost for 100 tokens at $2.50/M", () => {
    expect(calculateCost(100, 2.5)).toBeCloseTo(0.00025, 6);
  });

  it("returns 0 for zero tokens", () => {
    expect(calculateCost(0, 2.5)).toBe(0);
  });

  it("returns 0 for zero cost per M", () => {
    expect(calculateCost(1000, 0)).toBe(0);
  });

  it("handles large token counts", () => {
    expect(calculateCost(10_000_000, 1)).toBe(10);
  });
});

// ── COST_DECIMAL_PLACES ────────────────────────────────

describe("COST_DECIMAL_PLACES", () => {
  it("is 6 digits", () => {
    expect(COST_DECIMAL_PLACES).toBe(6);
  });
});

// ── PRICING_SNAPSHOT_VERSION ───────────────────────────

describe("PRICING_SNAPSHOT_VERSION", () => {
  it("is a non-empty date string", () => {
    expect(PRICING_SNAPSHOT_VERSION).toBeTruthy();
    expect(PRICING_SNAPSHOT_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ── TOKENIZER_PRICING ──────────────────────────────────

describe("TOKENIZER_PRICING", () => {
  it("has 4 entries", () => {
    expect(TOKENIZER_PRICING).toHaveLength(4);
  });

  it("has no duplicate names", () => {
    const names = TOKENIZER_PRICING.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("all have positive costPerMToken", () => {
    for (const p of TOKENIZER_PRICING) {
      expect(p.costPerMToken).toBeGreaterThan(0);
    }
  });

  it("all have non-empty displayName", () => {
    for (const p of TOKENIZER_PRICING) {
      expect(p.displayName.length).toBeGreaterThan(0);
    }
  });
});

// ── getFairnessThreshold ───────────────────────────────

describe("getFairnessThreshold", () => {
  it("returns Fair for score >= 70", () => {
    expect(getFairnessThreshold(70).label).toBe("Fair");
    expect(getFairnessThreshold(100).label).toBe("Fair");
    expect(getFairnessThreshold(85).label).toBe("Fair");
  });

  it("returns Moderate for score 40-69", () => {
    expect(getFairnessThreshold(40).label).toBe("Moderate");
    expect(getFairnessThreshold(69).label).toBe("Moderate");
    expect(getFairnessThreshold(50).label).toBe("Moderate");
  });

  it("returns Biased for score 0-39", () => {
    expect(getFairnessThreshold(0).label).toBe("Biased");
    expect(getFairnessThreshold(39).label).toBe("Biased");
    expect(getFairnessThreshold(10).label).toBe("Biased");
  });

  it("clamps negative scores to 0 (Biased)", () => {
    expect(getFairnessThreshold(-10).label).toBe("Biased");
  });

  it("clamps scores > 100 to 100 (Fair)", () => {
    expect(getFairnessThreshold(150).label).toBe("Fair");
  });

  it("returns correct colors", () => {
    expect(getFairnessThreshold(80).color).toBe("#059669");
    expect(getFairnessThreshold(50).color).toBe("#f59e0b");
    expect(getFairnessThreshold(20).color).toBe("#ef4444");
  });
});

// ── FAIRNESS_THRESHOLDS ────────────────────────────────

describe("FAIRNESS_THRESHOLDS", () => {
  it("is sorted descending by min", () => {
    for (let i = 1; i < FAIRNESS_THRESHOLDS.length; i++) {
      const prev = FAIRNESS_THRESHOLDS[i - 1];
      const curr = FAIRNESS_THRESHOLDS[i];
      if (prev && curr) {
        expect(prev.min).toBeGreaterThan(curr.min);
      }
    }
  });

  it("has 3 tiers", () => {
    expect(FAIRNESS_THRESHOLDS).toHaveLength(3);
  });
});

// ── getHeatmapColor ────────────────────────────────────

describe("getHeatmapColor", () => {
  it("returns fair for ratio <= 110", () => {
    expect(getHeatmapColor(100)).toBe(HEATMAP_COLORS.fair);
    expect(getHeatmapColor(110)).toBe(HEATMAP_COLORS.fair);
  });

  it("returns slight for ratio 111-150", () => {
    expect(getHeatmapColor(111)).toBe(HEATMAP_COLORS.slight);
    expect(getHeatmapColor(150)).toBe(HEATMAP_COLORS.slight);
  });

  it("returns moderate for ratio 151-200", () => {
    expect(getHeatmapColor(151)).toBe(HEATMAP_COLORS.moderate);
    expect(getHeatmapColor(200)).toBe(HEATMAP_COLORS.moderate);
  });

  it("returns high for ratio 201-300", () => {
    expect(getHeatmapColor(201)).toBe(HEATMAP_COLORS.high);
    expect(getHeatmapColor(300)).toBe(HEATMAP_COLORS.high);
  });

  it("returns severe for ratio > 300", () => {
    expect(getHeatmapColor(301)).toBe(HEATMAP_COLORS.severe);
    expect(getHeatmapColor(500)).toBe(HEATMAP_COLORS.severe);
  });
});

// ── getLanguageFamily ──────────────────────────────────

describe("getLanguageFamily", () => {
  it("returns Germanic for English", () => {
    expect(getLanguageFamily("en")).toBe("Germanic");
  });

  it("returns Romance for French", () => {
    expect(getLanguageFamily("fr")).toBe("Romance");
  });

  it("returns Sino-Tibetan for Chinese", () => {
    expect(getLanguageFamily("zh")).toBe("Sino-Tibetan");
  });

  it("returns Japonic for Japanese", () => {
    expect(getLanguageFamily("ja")).toBe("Japonic");
  });

  it("returns Other for unknown language code", () => {
    expect(getLanguageFamily("xx")).toBe("Other");
  });

  it("returns Other for empty string", () => {
    expect(getLanguageFamily("")).toBe("Other");
  });
});

// ── LANGUAGE_FAMILIES ──────────────────────────────────

describe("LANGUAGE_FAMILIES", () => {
  it("has at least 20 language entries", () => {
    expect(Object.keys(LANGUAGE_FAMILIES).length).toBeGreaterThanOrEqual(20);
  });
});

// ── CHART_COLORS ───────────────────────────────────────

describe("CHART_COLORS", () => {
  it("has exact and estimated colors", () => {
    expect(CHART_COLORS.exact).toBeTruthy();
    expect(CHART_COLORS.estimated).toBeTruthy();
  });

  it("exact and estimated are different", () => {
    expect(CHART_COLORS.exact).not.toBe(CHART_COLORS.estimated);
  });

  it("has grid, axis, and tick colors", () => {
    expect(CHART_COLORS.grid).toBeTruthy();
    expect(CHART_COLORS.axis).toBeTruthy();
    expect(CHART_COLORS.tick).toBeTruthy();
  });
});
