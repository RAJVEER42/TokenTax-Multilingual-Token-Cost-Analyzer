/**
 * useTokenAnalysis Hook Tests — Phase 5
 *
 * Validates:
 * - analyze() sets loading state and calls API
 * - Successful analysis updates store result
 * - Error sets store error message
 * - Cache fallback: on error with existing result, keeps old result
 * - Abort: stale requests don't update state
 * - retry() re-calls with last params
 * - Empty text shows validation error
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTokenAnalysis } from "@/hooks/useTokenAnalysis";
import { useAnalysisStore } from "@/store/analysisStore";
import { ApiError } from "@/services/api";
import type { AnalyzeResponse } from "@/types";

// ── Mock API Service ───────────────────────────────────

const mockResponse: AnalyzeResponse = {
  text_length: 5,
  language: "en",
  results: [
    {
      tokenizer_name: "tiktoken",
      tokenizer_version: "0.7.0",
      token_count: 1,
      char_count: 5,
      efficiency_ratio: 5.0,
      confidence: "EXACT",
      language: "en",
      error: null,
    },
  ],
  fairness: [],
  glitches: [],
  errors: [],
  warnings: [],
  formula_version: "1.0",
  cached: false,
};

// Mock only analyzeText, keep ApiError real
const mockAnalyzeText = vi.fn();

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    analyzeText: (...args: unknown[]) => mockAnalyzeText(...args),
  };
});

// ── Setup ──────────────────────────────────────────────

beforeEach(() => {
  useAnalysisStore.getState().reset();
  mockAnalyzeText.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── Tests ──────────────────────────────────────────────

describe("useTokenAnalysis — analyze()", () => {
  it("sets loading true during request", async () => {
    let loadingDuringRequest = false;
    let resolveRequest!: (v: AnalyzeResponse) => void;

    mockAnalyzeText.mockImplementation(() => {
      // Capture loading state at the moment the API is called
      loadingDuringRequest = useAnalysisStore.getState().loading;
      return new Promise<AnalyzeResponse>((resolve) => {
        resolveRequest = resolve;
      });
    });

    useAnalysisStore.getState().setInputText("hello");

    const { result } = renderHook(() => useTokenAnalysis());

    await act(async () => {
      const promise = result.current.analyze();
      resolveRequest(mockResponse);
      await promise;
    });

    // Loading was true when API was called
    expect(loadingDuringRequest).toBe(true);
    // Loading is false after completion
    expect(useAnalysisStore.getState().loading).toBe(false);
  });

  it("updates store with analysis result on success", async () => {
    mockAnalyzeText.mockResolvedValue(mockResponse);

    useAnalysisStore.getState().setInputText("hello");

    const { result } = renderHook(() => useTokenAnalysis());

    await act(async () => {
      await result.current.analyze();
    });

    expect(useAnalysisStore.getState().analysisResult).toEqual(mockResponse);
    expect(useAnalysisStore.getState().error).toBeNull();
    expect(useAnalysisStore.getState().loading).toBe(false);
  });

  it("sets error message on API failure", async () => {
    mockAnalyzeText.mockRejectedValue(
      new ApiError({
        message: "Server error",
        status: 500,
        code: "SERVER_ERROR",
        retryable: true,
      }),
    );

    useAnalysisStore.getState().setInputText("hello");

    const { result } = renderHook(() => useTokenAnalysis());

    await act(async () => {
      await result.current.analyze();
    });

    expect(useAnalysisStore.getState().error).toBe("Server error");
    expect(useAnalysisStore.getState().loading).toBe(false);
  });

  it("shows validation error for empty text", async () => {
    useAnalysisStore.getState().setInputText("   ");

    const { result } = renderHook(() => useTokenAnalysis());

    await act(async () => {
      await result.current.analyze();
    });

    expect(useAnalysisStore.getState().error).toBe(
      "Please enter text to analyze.",
    );
  });
});

describe("useTokenAnalysis — analyzeWith()", () => {
  it("calls API with provided params", async () => {
    mockAnalyzeText.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useTokenAnalysis());

    const params = { text: "test", language: "fr", tokenizers: ["tiktoken"] as string[] };
    await act(async () => {
      await result.current.analyzeWith(params);
    });

    expect(mockAnalyzeText).toHaveBeenCalledWith(params, expect.anything());
    expect(useAnalysisStore.getState().analysisResult).toEqual(mockResponse);
  });
});

describe("useTokenAnalysis — Cache Fallback", () => {
  it("keeps previous result on API failure (cache fallback)", async () => {
    // First: set a successful analysis result in store
    useAnalysisStore.getState().setAnalysisResult(mockResponse);

    // Second: API fails
    mockAnalyzeText.mockRejectedValue(
      new ApiError({
        message: "Network error",
        status: 0,
        code: "NETWORK_ERROR",
        retryable: true,
      }),
    );

    useAnalysisStore.getState().setInputText("retry me");

    const { result } = renderHook(() => useTokenAnalysis());

    await act(async () => {
      await result.current.analyze();
    });

    // Old result should still be there
    expect(useAnalysisStore.getState().analysisResult).toEqual(mockResponse);
    // But error and fallback flag should be set
    expect(useAnalysisStore.getState().error).toBe("Network error");
    expect(useAnalysisStore.getState().usingCachedFallback).toBe(true);
  });
});

describe("useTokenAnalysis — retry()", () => {
  it("retries with last params", async () => {
    // First call fails
    mockAnalyzeText.mockRejectedValueOnce(
      new ApiError({
        message: "Timeout",
        status: 0,
        code: "TIMEOUT",
        retryable: true,
      }),
    );

    useAnalysisStore.getState().setInputText("hello");

    const { result } = renderHook(() => useTokenAnalysis());

    await act(async () => {
      await result.current.analyze();
    });

    expect(useAnalysisStore.getState().error).toBe("Timeout");

    // Retry succeeds
    mockAnalyzeText.mockResolvedValueOnce(mockResponse);

    await act(async () => {
      await result.current.retry();
    });

    expect(useAnalysisStore.getState().analysisResult).toEqual(mockResponse);
    expect(useAnalysisStore.getState().error).toBeNull();
  });

  it("does nothing if no previous params", async () => {
    const { result } = renderHook(() => useTokenAnalysis());

    await act(async () => {
      await result.current.retry();
    });

    expect(mockAnalyzeText).not.toHaveBeenCalled();
  });
});

describe("useTokenAnalysis — Abort on Unmount", () => {
  it("aborts pending request on unmount", async () => {
    let rejectRequest!: (reason: unknown) => void;
    mockAnalyzeText.mockImplementation(
      () =>
        new Promise<AnalyzeResponse>((_, reject) => {
          rejectRequest = reject;
        }),
    );

    useAnalysisStore.getState().setInputText("hello");

    const { result, unmount } = renderHook(() => useTokenAnalysis());

    // Start but don't await
    act(() => {
      void result.current.analyze();
    });

    // Unmount — should abort
    unmount();

    // Resolve the pending promise with abort error — should not crash
    rejectRequest(new DOMException("Aborted", "AbortError"));

    // Store should not have been updated with error (aborted = silently ignored)
    expect(useAnalysisStore.getState().error).toBeNull();
  });
});

describe("useTokenAnalysis — Return Shape", () => {
  it("returns all expected properties", () => {
    const { result } = renderHook(() => useTokenAnalysis());

    expect(result.current).toHaveProperty("analyze");
    expect(result.current).toHaveProperty("analyzeWith");
    expect(result.current).toHaveProperty("retry");
    expect(result.current).toHaveProperty("loading");
    expect(result.current).toHaveProperty("error");
    expect(result.current).toHaveProperty("usingCachedFallback");
    expect(result.current).toHaveProperty("retryCount");

    expect(typeof result.current.analyze).toBe("function");
    expect(typeof result.current.analyzeWith).toBe("function");
    expect(typeof result.current.retry).toBe("function");
    expect(typeof result.current.loading).toBe("boolean");
    expect(typeof result.current.usingCachedFallback).toBe("boolean");
    expect(typeof result.current.retryCount).toBe("number");
  });
});
