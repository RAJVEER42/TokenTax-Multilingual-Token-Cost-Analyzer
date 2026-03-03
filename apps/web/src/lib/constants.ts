/**
 * TokenTax — Application Constants
 *
 * Centralized configuration values used across components.
 * No hardcoded magic numbers in components — everything references here.
 *
 * Why centralize:
 * - Pricing data changes when providers update rates — one file to edit
 * - Color thresholds for fairness are policy decisions, not UI decisions
 * - Reproducible cost calculations require consistent decimal precision
 */

// ── Pricing Snapshot ───────────────────────────────────

export const PRICING_SNAPSHOT_VERSION = "2026-03-01";

export interface TokenizerPricing {
  readonly name: string;
  readonly displayName: string;
  readonly costPerMToken: number;
}

export const TOKENIZER_PRICING: readonly TokenizerPricing[] = [
  { name: "tiktoken", displayName: "GPT-4o (TikToken)", costPerMToken: 2.50 },
  { name: "sentencepiece", displayName: "LLaMA 3 (SentencePiece)", costPerMToken: 0.20 },
  { name: "claude", displayName: "Claude 3.5 (Heuristic)", costPerMToken: 3.00 },
  { name: "huggingface", displayName: "HuggingFace (BERT)", costPerMToken: 0.10 },
] as const;

export function getPricing(tokenizerName: string): TokenizerPricing | null {
  return TOKENIZER_PRICING.find((p) => tokenizerName.includes(p.name)) ?? null;
}

// ── Cost Calculation ───────────────────────────────────

export const COST_DECIMAL_PLACES = 6;

export function calculateCost(tokenCount: number, costPerMToken: number): number {
  return (tokenCount / 1_000_000) * costPerMToken;
}

// ── Fairness Thresholds ────────────────────────────────

export interface FairnessThreshold {
  readonly min: number;
  readonly label: string;
  readonly color: string;
  readonly bgClass: string;
  readonly textClass: string;
  readonly borderClass: string;
}

export const FAIRNESS_THRESHOLDS: readonly FairnessThreshold[] = [
  { min: 70, label: "Fair", color: "#059669", bgClass: "bg-emerald-500/15", textClass: "text-emerald-400", borderClass: "border-emerald-500/30" },
  { min: 40, label: "Moderate", color: "#f59e0b", bgClass: "bg-amber-500/15", textClass: "text-amber-400", borderClass: "border-amber-500/30" },
  { min: 0, label: "Biased", color: "#ef4444", bgClass: "bg-red-500/15", textClass: "text-red-400", borderClass: "border-red-500/30" },
] as const;

export function getFairnessThreshold(score: number): FairnessThreshold {
  const clamped = Math.max(0, Math.min(100, score));
  for (const t of FAIRNESS_THRESHOLDS) {
    if (clamped >= t.min) return t;
  }
  return FAIRNESS_THRESHOLDS[FAIRNESS_THRESHOLDS.length - 1]!;
}

// ── Chart Colors (design-token aligned) ────────────────

export const CHART_COLORS = {
  exact: "#6366f1",
  estimated: "#f59e0b",
  grid: "rgba(255,255,255,0.06)",
  axis: "rgba(255,255,255,0.08)",
  tick: "#94a3b8",
  tooltipBg: "rgba(15,23,42,0.95)",
  tooltipBorder: "rgba(255,255,255,0.1)",
} as const;

// ── Heatmap Color Scale ────────────────────────────────

export const HEATMAP_COLORS = {
  fair: "#059669",
  slight: "#10b981",
  moderate: "#f59e0b",
  high: "#ef4444",
  severe: "#dc2626",
} as const;

export function getHeatmapColor(ratioPercent: number): string {
  if (ratioPercent <= 110) return HEATMAP_COLORS.fair;
  if (ratioPercent <= 150) return HEATMAP_COLORS.slight;
  if (ratioPercent <= 200) return HEATMAP_COLORS.moderate;
  if (ratioPercent <= 300) return HEATMAP_COLORS.high;
  return HEATMAP_COLORS.severe;
}

// ── Language Families ──────────────────────────────────

export const LANGUAGE_FAMILIES: Readonly<Record<string, string>> = {
  en: "Germanic", de: "Germanic", nl: "Germanic", sv: "Germanic", da: "Germanic",
  fr: "Romance", es: "Romance", it: "Romance", pt: "Romance", ro: "Romance",
  zh: "Sino-Tibetan", ja: "Japonic", ko: "Koreanic",
  ar: "Afro-Asiatic", he: "Afro-Asiatic",
  hi: "Indo-Aryan", bn: "Indo-Aryan", ur: "Indo-Aryan",
  ta: "Dravidian", te: "Dravidian",
  th: "Tai-Kadai", vi: "Austroasiatic",
  ru: "Slavic", pl: "Slavic", uk: "Slavic",
  tr: "Turkic", sw: "Niger-Congo",
} as const;

export function getLanguageFamily(code: string): string {
  return LANGUAGE_FAMILIES[code] ?? "Other";
}
