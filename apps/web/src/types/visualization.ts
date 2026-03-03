/**
 * TokenTax — Visualization Type Definitions (Phase 6)
 *
 * Chart-specific data shapes consumed by visualization components.
 * Separated from core types because these are UI-only concerns —
 * they never appear in API contracts or store state.
 *
 * Why separate file:
 * - Core types (index.ts) are API contracts — shared with backend
 * - Visualization types are frontend-only presentation shapes
 * - Keeps index.ts under the 500-line limit
 * - Components import only what they need
 */

import type { ConfidenceLevel } from "@/types";

// ── Cost Breakdown ─────────────────────────────────────

export interface CostDataPoint {
  readonly tokenizer: string;
  readonly displayName: string;
  readonly tokenCount: number;
  readonly costPerMToken: number;
  readonly estimatedCost: number;
  readonly isLowest: boolean;
  readonly snapshotVersion: string;
}

// ── Heatmap ────────────────────────────────────────────

export interface HeatmapCell {
  readonly tokenizer: string;
  readonly displayName: string;
  readonly language: string;
  readonly tokenCount: number;
  readonly ratioPercent: number;
  readonly color: string;
}

// ── Fairness Gauge ─────────────────────────────────────

export interface GaugeDataPoint {
  readonly tokenizer: string;
  readonly score: number;
  readonly label: string;
  readonly color: string;
  readonly formulaVersion: string;
  readonly tokenRatio: number;
}

// ── Treemap ────────────────────────────────────────────

export interface TreemapNode {
  readonly name: string;
  readonly tokenCount: number;
  readonly fairnessScore: number;
  readonly color: string;
  readonly language: string;
}

// ── Scatter Plot ───────────────────────────────────────

export interface ScatterDataPoint {
  readonly tokenizer: string;
  readonly language: string;
  readonly languageFamily: string;
  readonly tokenRatio: number;
  readonly fairnessScore: number;
}

// ── Enhanced Chart Data (extends ChartDataPoint with cost) ──

export interface EnhancedChartDataPoint {
  readonly tokenizer: string;
  readonly displayName: string;
  readonly tokenCount: number;
  readonly efficiency: number;
  readonly confidence: ConfidenceLevel;
  readonly estimatedCost: number;
  readonly costPerMToken: number;
}
