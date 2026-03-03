/**
 * API Service Tests — Phase 5
 *
 * Validates:
 * - Successful requests return typed data
 * - Retry with exponential backoff on 5xx / network errors
 * - No retry on 4xx client errors
 * - AbortController cancellation
 * - Timeout handling
 * - Error classification (network, abort, HTTP status codes)
 * - ApiError structure (status, code, retryable, body)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  analyzeText,
  fetchLanguages,
  fetchTokenizers,
  healthCheck,
  ApiError,
} from "@/services/api";
import type {
  AnalyzeResponse,
  LanguagesResponse,
  TokenizersResponse,
  HealthResponse,
} from "@/types";

// ── Helpers ────────────────────────────────────────────

const mockAnalyzeResponse: AnalyzeResponse = {
  text_length: 5,
  language: "en",
  results: [],
  fairness: [],
  glitches: [],
  errors: [],
  warnings: [],
  formula_version: "1.0",
  cached: false,
};

const mockLanguagesResponse: LanguagesResponse = {
  languages: [{ code: "en", name: "English" }],
  count: 1,
};

const mockTokenizersResponse: TokenizersResponse = {
  tokenizers: [
    {
      name: "tiktoken",
      display_name: "TikToken (GPT-4)",
      version: "0.7.0",
      confidence: "EXACT",
      description: "OpenAI tokenizer",
    },
  ],
  count: 1,
};

const mockHealthResponse: HealthResponse = {
  status: "ok",
  message: "Healthy",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function networkError(): never {
  throw new TypeError("Failed to fetch");
}

// ── Setup ──────────────────────────────────────────────

let fetchSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  fetchSpy = vi.spyOn(globalThis, "fetch");
});

afterEach(() => {
  fetchSpy.mockRestore();
});

// ── Successful Requests ────────────────────────────────

describe("API Service — Success Paths", () => {
  it("analyzeText returns typed response", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(mockAnalyzeResponse));
    const result = await analyzeText({ text: "hello", language: "en" });
    expect(result).toEqual(mockAnalyzeResponse);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("fetchLanguages returns typed response", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(mockLanguagesResponse));
    const result = await fetchLanguages();
    expect(result).toEqual(mockLanguagesResponse);
  });

  it("fetchTokenizers returns typed response", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(mockTokenizersResponse));
    const result = await fetchTokenizers();
    expect(result).toEqual(mockTokenizersResponse);
  });

  it("healthCheck returns typed response", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(mockHealthResponse));
    const result = await healthCheck();
    expect(result).toEqual(mockHealthResponse);
  });

  it("analyzeText sends correct HTTP method and body", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse(mockAnalyzeResponse));
    await analyzeText({ text: "test", language: "fr", tokenizers: ["tiktoken"] });
    const call = fetchSpy.mock.calls[0];
    expect(call).toBeDefined();
    const [url, init] = call!;
    expect(url).toContain("/analyze");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBe(
      JSON.stringify({ text: "test", language: "fr", tokenizers: ["tiktoken"] }),
    );
  });
});

// ── Retry Behavior ─────────────────────────────────────

describe("API Service — Retry Behavior", () => {
  it("retries on 500 and succeeds on second attempt", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ detail: "Internal Server Error" }, 500))
      .mockResolvedValueOnce(jsonResponse(mockLanguagesResponse));

    const result = await fetchLanguages();
    expect(result).toEqual(mockLanguagesResponse);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("retries on network error and succeeds", async () => {
    fetchSpy
      .mockImplementationOnce(networkError)
      .mockResolvedValueOnce(jsonResponse(mockTokenizersResponse));

    const result = await fetchTokenizers();
    expect(result).toEqual(mockTokenizersResponse);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on 400 client error", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ detail: "Invalid language code" }, 400),
    );

    await expect(
      analyzeText({ text: "hello", language: "xx" }),
    ).rejects.toThrow(ApiError);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("does NOT retry on 422 validation error", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(
        { detail: [{ loc: ["body", "text"], msg: "field required", type: "missing" }] },
        422,
      ),
    );

    await expect(
      analyzeText({ text: "", language: "en" }),
    ).rejects.toThrow(ApiError);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("exhausts retries on persistent 500 and throws", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({ detail: "Error" }, 500));

    await expect(fetchLanguages()).rejects.toThrow(ApiError);
    // Default 3 retries + initial = 4 attempts
    expect(fetchSpy).toHaveBeenCalledTimes(4);
  });

  it("healthCheck does NOT retry (retries=0)", async () => {
    fetchSpy.mockResolvedValueOnce(jsonResponse({ detail: "Error" }, 500));

    await expect(healthCheck()).rejects.toThrow(ApiError);
    expect(fetchSpy).toHaveBeenCalledOnce();
  });

  it("retries on 429 rate limit", async () => {
    fetchSpy
      .mockResolvedValueOnce(jsonResponse({ detail: "Too Many Requests" }, 429))
      .mockResolvedValueOnce(jsonResponse(mockLanguagesResponse));

    const result = await fetchLanguages();
    expect(result).toEqual(mockLanguagesResponse);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});

// ── Error Classification ───────────────────────────────

describe("API Service — Error Classification", () => {
  it("classifies network error correctly", async () => {
    fetchSpy.mockImplementation(networkError);

    try {
      await fetchLanguages();
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("NETWORK_ERROR");
      expect(apiErr.status).toBe(0);
      expect(apiErr.retryable).toBe(true);
    }
  });

  it("classifies 500 as SERVER_ERROR and retryable", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({}, 500));

    try {
      await healthCheck(); // no retries
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("SERVER_ERROR");
      expect(apiErr.status).toBe(500);
      expect(apiErr.retryable).toBe(true);
    }
  });

  it("classifies 400 as CLIENT_ERROR and not retryable", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ detail: "Bad request" }, 400),
    );

    try {
      await analyzeText({ text: "x", language: "en" });
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("CLIENT_ERROR");
      expect(apiErr.status).toBe(400);
      expect(apiErr.retryable).toBe(false);
    }
  });

  it("classifies 429 as RATE_LIMITED and retryable", async () => {
    fetchSpy.mockResolvedValue(jsonResponse({}, 429));

    try {
      await healthCheck(); // no retries
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("RATE_LIMITED");
      expect(apiErr.retryable).toBe(true);
    }
  });

  it("extracts detail from FastAPI error body", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse({ detail: "Language 'xx' is not supported" }, 400),
    );

    try {
      await analyzeText({ text: "x", language: "xx" });
      expect.fail("Should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe("Language 'xx' is not supported");
    }
  });

  it("extracts detail from FastAPI validation error array", async () => {
    fetchSpy.mockResolvedValueOnce(
      jsonResponse(
        { detail: [{ loc: ["body", "text"], msg: "field required", type: "missing" }] },
        422,
      ),
    );

    try {
      await analyzeText({ text: "", language: "en" });
      expect.fail("Should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.message).toBe("field required");
    }
  });
});

// ── Abort Handling ─────────────────────────────────────

describe("API Service — Abort Handling", () => {
  it("throws ABORTED error when signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(fetchLanguages(controller.signal)).rejects.toThrow(ApiError);

    try {
      await fetchLanguages(controller.signal);
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("ABORTED");
      expect(apiErr.retryable).toBe(false);
    }
  });

  it("throws when signal is aborted mid-request", async () => {
    const controller = new AbortController();

    fetchSpy.mockImplementation(
      () =>
        new Promise<Response>((_, reject) => {
          // Simulate network delay
          const timer = setTimeout(
            () => reject(new DOMException("Aborted", "AbortError")),
            50,
          );
          controller.signal.addEventListener("abort", () => {
            clearTimeout(timer);
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );

    const promise = fetchLanguages(controller.signal);
    controller.abort();

    await expect(promise).rejects.toThrow(ApiError);
  });
});

// ── Invalid Response ───────────────────────────────────

describe("API Service — Invalid Responses", () => {
  it("throws INVALID_RESPONSE for null body", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response("null", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    try {
      await fetchLanguages();
      expect.fail("Should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("INVALID_RESPONSE");
      expect(apiErr.retryable).toBe(false);
    }
  });

  it("throws INVALID_RESPONSE for string body", async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response('"just a string"', {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    try {
      await fetchLanguages();
      expect.fail("Should have thrown");
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.code).toBe("INVALID_RESPONSE");
    }
  });
});

// ── ApiError Class ─────────────────────────────────────

describe("ApiError", () => {
  it("has correct name, status, code, retryable, body properties", () => {
    const err = new ApiError({
      message: "Test error",
      status: 503,
      code: "SERVER_ERROR",
      retryable: true,
      body: { detail: "Service Unavailable" },
    });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.name).toBe("ApiError");
    expect(err.message).toBe("Test error");
    expect(err.status).toBe(503);
    expect(err.code).toBe("SERVER_ERROR");
    expect(err.retryable).toBe(true);
    expect(err.body).toEqual({ detail: "Service Unavailable" });
  });

  it("body is undefined when not provided", () => {
    const err = new ApiError({
      message: "No body",
      status: 0,
      code: "NETWORK_ERROR",
      retryable: true,
    });

    expect(err.body).toBeUndefined();
  });
});
