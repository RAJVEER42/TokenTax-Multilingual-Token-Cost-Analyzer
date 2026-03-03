/**
 * TokenTax — Centralized Type Definitions
 *
 * All API contracts and domain types live here.
 * Components, hooks, and services import from this single module.
 *
 * Why centralize types:
 * - Prevents type drift between components sharing the same data
 * - Single place to update when API contracts evolve
 * - Enables version-aware extension (formula_version field)
 * - No `any` — strict mode enforced
 */

// ── Enums ──────────────────────────────────────────────

/** Whether a tokenizer count is exact or heuristic-estimated. */
export type ConfidenceLevel = "EXACT" | "ESTIMATED";

/** Severity classification for detected glitch tokens. */
export type DangerLevel = "LOW" | "MEDIUM" | "HIGH";

// ── Core Domain Models ─────────────────────────────────

/** Result of tokenizing a single text with a single tokenizer. */
export interface TokenAnalysis {
  readonly tokenizer_name: string;
  readonly tokenizer_version: string;
  readonly token_count: number;
  readonly char_count: number;
  readonly efficiency_ratio: number;
  readonly confidence: ConfidenceLevel;
  readonly language: string;
  readonly error: string | null;
}

/** Fairness score for a single tokenizer vs English baseline. */
export interface FairnessResult {
  readonly tokenizer_name: string;
  readonly fairness_score: number;
  readonly token_ratio: number;
  readonly formula_version: string;
}

/** Structured error for a tokenizer that failed gracefully. */
export interface TokenizerError {
  readonly tokenizer_name: string;
  readonly error: string;
}

/**
 * A detected glitch token occurrence.
 *
 * Glitch tokens are tokenizer artefacts that can cause unexpected model
 * behaviour.  This is for *educational* display — detection ≠ vulnerability.
 */
export interface GlitchToken {
  readonly token_id: number;
  readonly token_text: string;
  readonly tokenizer_name: string;
  readonly tokenizer_version: string;
  readonly danger_level: DangerLevel;
  readonly effect: string;
  readonly reference: string;
  readonly positions: number[];
}

// ── API Request / Response ─────────────────────────────

/** POST /api/v1/analyze request body. */
export interface AnalyzeRequest {
  readonly text: string;
  readonly language: string;
  readonly tokenizers?: string[] | null;
}

/** POST /api/v1/analyze response body. */
export interface AnalyzeResponse {
  readonly text_length: number;
  readonly language: string;
  readonly results: TokenAnalysis[];
  readonly fairness: FairnessResult[];
  readonly glitches: GlitchToken[];
  readonly errors: TokenizerError[];
  readonly warnings: string[];
  readonly formula_version: string;
  readonly cached: boolean;
}

/** Static metadata about a single tokenizer adapter. */
export interface TokenizerInfo {
  readonly name: string;
  readonly display_name: string;
  readonly version: string;
  readonly confidence: ConfidenceLevel;
  readonly description: string;
}

/** GET /api/v1/tokenizers response body. */
export interface TokenizersResponse {
  readonly tokenizers: TokenizerInfo[];
  readonly count: number;
}

/** Language metadata. */
export interface LanguageInfo {
  readonly code: string;
  readonly name: string;
}

/** GET /api/v1/languages response body. */
export interface LanguagesResponse {
  readonly languages: LanguageInfo[];
  readonly count: number;
}

/** GET /api/v1/health/ping response body. */
export interface HealthResponse {
  readonly status: string;
  readonly message: string;
}

// ── Composite UI Types ─────────────────────────────────

/**
 * Aggregate view model for the analysis page.
 * Combines the API response with UI-specific concerns.
 */
export interface ComparisonResult {
  readonly text: string;
  readonly language: string;
  readonly analyses: TokenAnalysis[];
  readonly fairnessScores: Record<string, number>;
  readonly warnings: string[];
}

/**
 * Chart data point for ComparisonChart.
 * Pre-shaped for Recharts consumption — components should not transform API data.
 */
export interface ChartDataPoint {
  readonly tokenizer: string;
  readonly displayName: string;
  readonly tokenCount: number;
  readonly efficiency: number;
  readonly confidence: ConfidenceLevel;
}

// ── Utility Types ──────────────────────────────────────

/** Standard async operation state. */
export interface AsyncState<T> {
  readonly data: T | null;
  readonly loading: boolean;
  readonly error: string | null;
}

// ── Share Types ────────────────────────────────────────

/** POST /api/v1/share request body. */
export interface ShareCreateRequest {
  readonly input_text: string;
  readonly language: string;
  readonly payload: AnalyzeResponse;
}

/** POST /api/v1/share response body. */
export interface ShareCreateResponse {
  readonly short_id: string;
  readonly share_url: string;
  readonly created_at: string;
}

/** GET /api/v1/share/:id response body. */
export interface ShareRetrieveResponse {
  readonly short_id: string;
  readonly input_text: string;
  readonly language: string;
  readonly payload: AnalyzeResponse;
  readonly formula_version: string;
  readonly created_at: string;
  readonly expires_at: string | null;
}

// ── Tutorial Types ─────────────────────────────────────

/** Persisted tutorial progress for /learn page. */
export interface TutorialProgress {
  readonly currentStep: number;
  readonly completedSteps: number[];
  readonly startedAt: string;
}
