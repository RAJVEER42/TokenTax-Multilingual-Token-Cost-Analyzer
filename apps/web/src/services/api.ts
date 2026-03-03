/**
 * TokenTax API Service Layer
 *
 * All HTTP communication with the backend lives here.
 * Components must NEVER call fetch directly.
 *
 * Why isolate API calls:
 * - Single place to change base URL, headers, auth tokens
 * - Typed request/response contracts catch drift at compile time
 * - Error handling is centralized — no duplicated try/catch in 20 components
 * - Easy to mock for testing — swap one module, not 20 fetch calls
 * - Rate limiting, retry logic, caching headers added once
 */

import type {
  AnalyzeRequest,
  AnalyzeResponse,
  LanguagesResponse,
  TokenizersResponse,
  HealthResponse,
} from "@/types";

// ── Configuration ──────────────────────────────────────

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "/api/v1";

// ── Error Handling ─────────────────────────────────────

export class ApiError extends Error {
  readonly status: number;
  readonly body?: unknown;

  constructor(
    message: string,
    status: number,
    body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

// ── Core Fetch Wrapper ─────────────────────────────────

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }
    throw new ApiError(
      `API request failed: ${response.status} ${response.statusText}`,
      response.status,
      body,
    );
  }

  return response.json() as Promise<T>;
}

// ── Typed API Methods ──────────────────────────────────

/** POST /analyze — Run tokenization + fairness analysis. */
export async function analyzeText(
  payload: AnalyzeRequest,
): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>("/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** GET /languages — Fetch all supported languages. */
export async function fetchLanguages(): Promise<LanguagesResponse> {
  return request<LanguagesResponse>("/languages");
}

/** GET /tokenizers — Fetch all available tokenizer metadata. */
export async function fetchTokenizers(): Promise<TokenizersResponse> {
  return request<TokenizersResponse>("/tokenizers");
}

/** GET /health/ping — Health check. */
export async function healthCheck(): Promise<HealthResponse> {
  return request<HealthResponse>("/health/ping");
}
