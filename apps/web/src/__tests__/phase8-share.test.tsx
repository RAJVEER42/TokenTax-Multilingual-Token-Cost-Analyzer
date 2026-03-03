// filepath: /Users/rajveerbishnoi/TokenTax/apps/web/src/__tests__/phase8-share.test.tsx
/**
 * Phase 8 Tests — SharePage, Tutorial Data, FAQ Data,
 * and useImageExport hook.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ──────────────────────────────────────────────

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const { initial: _i, animate: _a, exit: _e, transition: _t, whileHover: _wh, whileTap: _wt, ...rest } = props;
      const filtered: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (typeof v !== "object" || v === null) filtered[k] = v;
        else if (k === "className" || k === "style") filtered[k] = v;
      }
      return <div {...filtered}>{children as React.ReactNode}</div>;
    },
    span: ({ children, ...props }: Record<string, unknown>) => {
      const { initial: _i, animate: _a, exit: _e, transition: _t, ...rest } = props;
      const filtered: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(rest)) {
        if (typeof v !== "object" || v === null) filtered[k] = v;
        else if (k === "className" || k === "style") filtered[k] = v;
      }
      return <span {...filtered}>{children as React.ReactNode}</span>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock html-to-image
vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,test"),
}));

// ── Helpers ────────────────────────────────────────────

function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
}

// ── SharePage Tests ─────────────────────────────────────

describe("SharePage", () => {
  const mockShareResponse = {
    short_id: "abc12345",
    input_text: "Hello world",
    language: "en",
    payload: {
      text_length: 11,
      language: "en",
      results: [
        {
          tokenizer_name: "tiktoken",
          tokenizer_version: "0.12.0",
          token_count: 3,
          char_count: 11,
          efficiency_ratio: 0.273,
          confidence: "EXACT" as const,
          language: "en",
          error: null,
        },
      ],
      fairness: [
        {
          tokenizer_name: "tiktoken",
          fairness_score: 100,
          token_ratio: 100,
          formula_version: "1.0.0",
        },
      ],
      glitches: [],
      errors: [],
      warnings: [],
      formula_version: "1.0.0",
      cached: false,
    },
    formula_version: "1.0.0",
    created_at: "2026-03-01T00:00:00Z",
    expires_at: null,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows loading state", async () => {
    // Mock fetch to never resolve
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise(() => {}));

    const { default: SharePage } = await import("@/pages/SharePage");
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={["/share/abc12345"]}>
          <Routes>
            <Route path="/share/:id" element={<SharePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(screen.getByText("Loading shared analysis…")).toBeInTheDocument();
  });

  it("shows error for invalid share ID", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Not found"));

    const { default: SharePage } = await import("@/pages/SharePage");
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={["/share/invalid"]}>
          <Routes>
            <Route path="/share/:id" element={<SharePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Analysis Not Found")).toBeInTheDocument();
    });
  });

  it("renders shared analysis with data", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockShareResponse,
    } as Response);

    const { default: SharePage } = await import("@/pages/SharePage");
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={["/share/abc12345"]}>
          <Routes>
            <Route path="/share/:id" element={<SharePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("TokenTax Analysis")).toBeInTheDocument();
      expect(screen.getByText("ID: abc12345")).toBeInTheDocument();
    });
  });

  it("renders copy link and download PNG buttons", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockShareResponse,
    } as Response);

    const { default: SharePage } = await import("@/pages/SharePage");
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={["/share/abc12345"]}>
          <Routes>
            <Route path="/share/:id" element={<SharePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Copy Link")).toBeInTheDocument();
      expect(screen.getByText("Download PNG")).toBeInTheDocument();
    });
  });

  it("displays formula version metadata", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => mockShareResponse,
    } as Response);

    const { default: SharePage } = await import("@/pages/SharePage");
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemoryRouter initialEntries={["/share/abc12345"]}>
          <Routes>
            <Route path="/share/:id" element={<SharePage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText("Formula v1.0.0")).toBeInTheDocument();
    });
  });
});

// ── Tutorial Data Tests ─────────────────────────────────

describe("Tutorial Steps Data", () => {
  it("has exactly 6 steps", async () => {
    const { TUTORIAL_STEPS, TOTAL_STEPS } = await import(
      "@/lib/tutorial-steps"
    );
    expect(TUTORIAL_STEPS).toHaveLength(6);
    expect(TOTAL_STEPS).toBe(6);
  });

  it("all steps have required fields", async () => {
    const { TUTORIAL_STEPS } = await import("@/lib/tutorial-steps");
    for (const step of TUTORIAL_STEPS) {
      expect(step.id).toBeDefined();
      expect(step.title).toBeTruthy();
      expect(step.subtitle).toBeTruthy();
      expect(step.description).toBeTruthy();
      expect(step.type).toBeTruthy();
    }
  });
});

// ── FAQ Data Tests ──────────────────────────────────────

describe("FAQ Data", () => {
  it("has at least 10 items", async () => {
    const { FAQ_ITEMS } = await import("@/lib/faq-data");
    expect(FAQ_ITEMS.length).toBeGreaterThanOrEqual(10);
  });

  it("all FAQ items have required fields", async () => {
    const { FAQ_ITEMS } = await import("@/lib/faq-data");
    for (const faq of FAQ_ITEMS) {
      expect(faq.id).toBeTruthy();
      expect(faq.question).toBeTruthy();
      expect(faq.answer).toBeTruthy();
      expect(faq.question.endsWith("?")).toBe(true);
    }
  });

  it("all FAQ IDs are unique", async () => {
    const { FAQ_ITEMS } = await import("@/lib/faq-data");
    const ids = FAQ_ITEMS.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ── Image Export Hook Tests ─────────────────────────────

describe("useImageExport", () => {
  it("module exports the hook", async () => {
    const mod = await import("@/hooks/useImageExport");
    expect(mod.useImageExport).toBeDefined();
    expect(typeof mod.useImageExport).toBe("function");
  });
});
