/**
 * TokenTax API Service Layer — Phase 5: Production-Grade
 *
 * All HTTP communication with the backend lives here.
 * Components must NEVER call fetch directly.
 *
 * Why isolate API calls:
 * - Single place to change base URL, headers, auth tokens
 * - Typed request/response contracts catch drift at compile time
 * - Error handling is centralized — no duplicated try/catch in 20 components
 * - Retry logic with exponential backoff prevents server overload
 * - AbortController support prevents race conditions during rapid typing
 * - Timeout handling prevents UI hanging on slow networks
 *
 * Why error boundaries matter:
 * - Users must never see raw backend error messages (security + UX)
 * - Retryable errors (network, 5xx) must be distinguished from
 *   non-retryable (4xx validation) to avoid pointless retry loops
 *
 * Why exponential backoff:
 * - Prevents thundering herd: if server is overloaded, N clients
 *   retrying simultaneously at fixed intervals make it worse
 * - Jitter spreads retries over time, reducing collision probability
 *
 * Why aborting stale requests:
 * - During rapid typing, each keystroke could trigger a request
 * - Without abort, responses arrive out-of-order → stale data overwrites fresh
 * - AbortController cancels in-flight requests, ensuring last-write-wins
 */

import type {
  AnalyzeRequest,
  AnalyzeResponse,
  LanguagesResponse,
  TokenizersResponse,
  HealthResponse,
  ShareCreateRequest,
  ShareCreateResponse,
  ShareRetrieveResponse,
  RegisterRequest,
  LoginRequest,
  TokenResponse,
  UserProfile,
} from "@/types";

// ── Configuration ──────────────────────────────────────

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "/api/v1";
const DEFAULT_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;

// ── Structured Error ───────────────────────────────────

export class ApiError extends Error {
  /** HTTP status code (0 for network errors). */
  readonly status: number;
  /** Machine-readable error code for programmatic handling. */
  readonly code: string;
  /** Whether this error is worth retrying (network, 5xx, timeout). */
  readonly retryable: boolean;
  /** Raw response body for debugging. */
  readonly body?: unknown;

  constructor(params: {
    message: string;
    status: number;
    code: string;
    retryable: boolean;
    body?: unknown;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.code = params.code;
    this.retryable = params.retryable;
    this.body = params.body;
  }
}

// ── Error Classification ───────────────────────────────

function classifyError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof DOMException && error.name === "AbortError") {
    return new ApiError({
      message: "Request was cancelled.",
      status: 0,
      code: "ABORTED",
      retryable: false,
    });
  }

  if (error instanceof TypeError && error.message.includes("fetch")) {
    return new ApiError({
      message: "Network error. Please check your connection.",
      status: 0,
      code: "NETWORK_ERROR",
      retryable: true,
    });
  }

  const msg = error instanceof Error ? error.message : "An unexpected error occurred.";
  return new ApiError({
    message: msg,
    status: 0,
    code: "UNKNOWN",
    retryable: false,
  });
}

function buildHttpError(status: number, body: unknown): ApiError {
  if (status === 408 || status === 504) {
    return new ApiError({
      message: "Request timed out. Please try again.",
      status,
      code: "TIMEOUT",
      retryable: true,
      body,
    });
  }
  if (status === 429) {
    return new ApiError({
      message: "Too many requests. Please wait a moment.",
      status,
      code: "RATE_LIMITED",
      retryable: true,
      body,
    });
  }
  if (status >= 500) {
    return new ApiError({
      message: "The server encountered an error. Please try again shortly.",
      status,
      code: "SERVER_ERROR",
      retryable: true,
      body,
    });
  }

  // 4xx — not retryable
  const detail = extractDetail(body);
  return new ApiError({
    message: detail ?? `Request failed with status ${status}.`,
    status,
    code: "CLIENT_ERROR",
    retryable: false,
    body,
  });
}

/** Extract a human-readable detail from a backend error body. */
function extractDetail(body: unknown): string | null {
  if (body != null && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length > 0) {
      const first = detail[0];
      if (typeof first === "object" && first != null && "msg" in first) {
        return String((first as { msg: unknown }).msg);
      }
    }
  }
  return null;
}

// ── Retry with Exponential Backoff ─────────────────────

function computeRetryDelay(attempt: number): number {
  // Exponential: 500ms, 1000ms, 2000ms + jitter (0–250ms)
  const exponential = BASE_RETRY_DELAY_MS * Math.pow(2, attempt);
  const jitter = Math.random() * 250;
  return exponential + jitter;
}

// ── Core Fetch Wrapper ─────────────────────────────────

interface RequestOptions extends Omit<RequestInit, "signal"> {
  /** Custom timeout in ms. Defaults to 30s. */
  timeoutMs?: number;
  /** AbortSignal for caller-controlled cancellation. */
  signal?: AbortSignal;
  /** Max retries for retryable errors. Defaults to MAX_RETRIES. */
  retries?: number;
}

async function request<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, signal, retries = MAX_RETRIES, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${endpoint}`;

  let lastError: ApiError | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    // Combine caller signal with timeout signal
    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

    // If caller already aborted, bail immediately
    if (signal?.aborted) {
      clearTimeout(timeoutId);
      throw classifyError(new DOMException("Aborted", "AbortError"));
    }

    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal;

    try {
      const response = await fetch(url, {
        headers: {
          "Content-Type": "application/json",
          ...fetchOptions.headers,
        },
        ...fetchOptions,
        signal: combinedSignal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let body: unknown;
        try {
          body = await response.json();
        } catch {
          body = await response.text().catch(() => null);
        }

        const error = buildHttpError(response.status, body);

        // Only retry retryable errors
        if (error.retryable && attempt < retries) {
          lastError = error;
          await sleep(computeRetryDelay(attempt));
          continue;
        }

        throw error;
      }

      const data: unknown = await response.json();
      // Runtime validation: ensure we got an object back
      if (data == null || typeof data !== "object") {
        throw new ApiError({
          message: "Invalid response format from server.",
          status: response.status,
          code: "INVALID_RESPONSE",
          retryable: false,
        });
      }

      return data as T;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof ApiError) {
        if (err.retryable && attempt < retries) {
          lastError = err;
          await sleep(computeRetryDelay(attempt));
          continue;
        }
        throw err;
      }

      const classified = classifyError(err);
      if (classified.retryable && attempt < retries) {
        lastError = classified;
        await sleep(computeRetryDelay(attempt));
        continue;
      }

      throw classified;
    }
  }

  // Should not reach here, but TypeScript needs the escape hatch
  throw lastError ?? new ApiError({
    message: "Request failed after maximum retries.",
    status: 0,
    code: "MAX_RETRIES",
    retryable: false,
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Typed API Methods ──────────────────────────────────

/** POST /analyze — Run tokenization + fairness analysis. */
export async function analyzeText(
  payload: AnalyzeRequest,
  signal?: AbortSignal,
): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>("/analyze", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
    // Analysis can be slow for large text — give more time
    timeoutMs: 60_000,
  });
}

/** GET /languages — Fetch all supported languages. */
export async function fetchLanguages(
  signal?: AbortSignal,
): Promise<LanguagesResponse> {
  return request<LanguagesResponse>("/languages", { signal });
}

/** GET /tokenizers — Fetch all available tokenizer metadata. */
export async function fetchTokenizers(
  signal?: AbortSignal,
): Promise<TokenizersResponse> {
  return request<TokenizersResponse>("/tokenizers", { signal });
}

/** GET /health/ping — Health check. No retries — fast fail. */
export async function healthCheck(
  signal?: AbortSignal,
): Promise<HealthResponse> {
  return request<HealthResponse>("/health/ping", {
    signal,
    retries: 0,
    timeoutMs: 5_000,
  });
}

// ── Share API ──────────────────────────────────────────

/** POST /share — Create a shareable analysis link. */
export async function createShare(
  payload: ShareCreateRequest,
  signal?: AbortSignal,
): Promise<ShareCreateResponse> {
  return request<ShareCreateResponse>("/share", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  });
}

/** GET /share/:id — Retrieve a shared analysis. */
export async function getShare(
  shortId: string,
  signal?: AbortSignal,
): Promise<ShareRetrieveResponse> {
  return request<ShareRetrieveResponse>(`/share/${shortId}`, { signal });
}

// ── Auth API ───────────────────────────────────────────

/** POST /auth/register — Create a new account. */
export async function register(
  payload: RegisterRequest,
  signal?: AbortSignal,
): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
    retries: 0,
  });
}

/** POST /auth/login — Authenticate with email & password. */
export async function login(
  payload: LoginRequest,
  signal?: AbortSignal,
): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
    retries: 0,
  });
}

/** POST /auth/refresh — Exchange refresh token for new pair. */
export async function refreshTokens(
  refreshToken: string,
  signal?: AbortSignal,
): Promise<TokenResponse> {
  return request<TokenResponse>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
    signal,
    retries: 0,
  });
}

/** GET /auth/me — Get current user profile (requires Bearer token). */
export async function getProfile(
  accessToken: string,
  signal?: AbortSignal,
): Promise<UserProfile> {
  return request<UserProfile>("/auth/me", {
    signal,
    retries: 0,
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
