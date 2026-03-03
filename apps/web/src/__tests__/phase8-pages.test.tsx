/**
 * Phase 8 Page Tests — LearnPage, ResearchPage, FAQPage,
 * GlitchTokensPage, SharePage rendering and behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
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

function renderWithRouter(ui: React.ReactElement, { route = "/" } = {}) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

// ── LearnPage Tests ────────────────────────────────────

describe("LearnPage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("renders the tutorial with first step", async () => {
    const { default: LearnPage } = await import("@/pages/LearnPage");
    renderWithRouter(<LearnPage />);

    expect(screen.getByText("Learn: Token Economics")).toBeInTheDocument();
    expect(screen.getByText("What Are Tokens?")).toBeInTheDocument();
    expect(screen.getAllByText(/Step 1 of 6/).length).toBeGreaterThanOrEqual(1);
  });

  it("navigates to next step on button click", async () => {
    const { default: LearnPage } = await import("@/pages/LearnPage");
    renderWithRouter(<LearnPage />);

    const nextButton = screen.getByText("Next");
    fireEvent.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText("Tokenization in Action")).toBeInTheDocument();
    });
  });

  it("persists progress in localStorage", async () => {
    const { default: LearnPage } = await import("@/pages/LearnPage");
    renderWithRouter(<LearnPage />);

    const nextButton = screen.getByText("Next");
    fireEvent.click(nextButton);

    await waitFor(() => {
      const stored = localStorage.getItem("tokentax-tutorial-progress");
      expect(stored).not.toBeNull();
      const parsed = JSON.parse(stored!);
      expect(parsed.data.currentStep).toBe(1);
    });
  });

  it("shows skip tutorial button on non-last steps", async () => {
    const { default: LearnPage } = await import("@/pages/LearnPage");
    renderWithRouter(<LearnPage />);

    expect(screen.getByText("Skip tutorial")).toBeInTheDocument();
  });

  it("shows Start Analyzing link on last step", async () => {
    const { default: LearnPage } = await import("@/pages/LearnPage");
    renderWithRouter(<LearnPage />);

    // Skip to end
    const skipButton = screen.getByText("Skip tutorial");
    fireEvent.click(skipButton);

    await waitFor(() => {
      expect(screen.getByText("Start Analyzing")).toBeInTheDocument();
      expect(screen.getByText("You're Ready!")).toBeInTheDocument();
    });
  });

  it("renders step dots for all 6 steps", async () => {
    const { default: LearnPage } = await import("@/pages/LearnPage");
    renderWithRouter(<LearnPage />);

    const dots = screen.getAllByRole("button", { name: /Go to step/ });
    expect(dots).toHaveLength(6);
  });
});

// ── ResearchPage Tests ─────────────────────────────────

describe("ResearchPage", () => {
  it("renders research methodology content", async () => {
    const { default: ResearchPage } = await import("@/pages/ResearchPage");
    renderWithRouter(<ResearchPage />);

    expect(screen.getByText("Research Methodology")).toBeInTheDocument();
    expect(screen.getByText("Abstract")).toBeInTheDocument();
    expect(screen.getByText("Core Formulas")).toBeInTheDocument();
  });

  it("displays fairness formula", async () => {
    const { default: ResearchPage } = await import("@/pages/ResearchPage");
    renderWithRouter(<ResearchPage />);

    expect(
      screen.getByText(/token_ratio = \(tokens_lang \/ tokens_en\) × 100/),
    ).toBeInTheDocument();
  });

  it("displays known limitations", async () => {
    const { default: ResearchPage } = await import("@/pages/ResearchPage");
    renderWithRouter(<ResearchPage />);

    expect(screen.getByText("Known Limitations")).toBeInTheDocument();
    expect(screen.getByText(/Translation equivalence/)).toBeInTheDocument();
  });

  it("displays versioning policy", async () => {
    const { default: ResearchPage } = await import("@/pages/ResearchPage");
    renderWithRouter(<ResearchPage />);

    expect(screen.getByText("Versioning Policy")).toBeInTheDocument();
  });

  it("displays references", async () => {
    const { default: ResearchPage } = await import("@/pages/ResearchPage");
    renderWithRouter(<ResearchPage />);

    expect(screen.getByText("References")).toBeInTheDocument();
    expect(screen.getByText(/Sennrich/)).toBeInTheDocument();
  });
});

// ── FAQPage Tests ──────────────────────────────────────

describe("FAQPage", () => {
  it("renders FAQ page with all questions", async () => {
    const { default: FAQPage } = await import("@/pages/FAQPage");
    renderWithRouter(<FAQPage />);

    expect(screen.getByText("Frequently Asked Questions")).toBeInTheDocument();
    expect(
      screen.getByText(/Why does Tamil text cost up to 4× more/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/What are glitch tokens/),
    ).toBeInTheDocument();
  });

  it("expands a FAQ item on click", async () => {
    const user = userEvent.setup();
    const { default: FAQPage } = await import("@/pages/FAQPage");
    renderWithRouter(<FAQPage />);

    const tamilQuestion = screen.getByText(
      /Why does Tamil text cost up to 4× more/,
    );
    await user.click(tamilQuestion);

    await waitFor(() => {
      expect(screen.getByText(/abugida script/)).toBeInTheDocument();
    });
  });

  it("has expand all / collapse all buttons", async () => {
    const { default: FAQPage } = await import("@/pages/FAQPage");
    renderWithRouter(<FAQPage />);

    expect(screen.getByText("Expand all")).toBeInTheDocument();
    expect(screen.getByText("Collapse all")).toBeInTheDocument();
  });

  it("expand all shows all answers", async () => {
    const user = userEvent.setup();
    const { default: FAQPage } = await import("@/pages/FAQPage");
    renderWithRouter(<FAQPage />);

    await user.click(screen.getByText("Expand all"));

    await waitFor(() => {
      expect(screen.getByText(/abugida script/)).toBeInTheDocument();
      expect(screen.getByText(/data-driven algorithm/)).toBeInTheDocument();
    });
  });

  it("has at least 8 FAQ items", async () => {
    const { FAQ_ITEMS } = await import("@/lib/faq-data");
    expect(FAQ_ITEMS.length).toBeGreaterThanOrEqual(8);
  });

  it("links to research page", async () => {
    const { default: FAQPage } = await import("@/pages/FAQPage");
    renderWithRouter(<FAQPage />);

    expect(screen.getByText("Read the Research")).toBeInTheDocument();
  });
});

// ── GlitchTokensPage Tests ─────────────────────────────

describe("GlitchTokensPage", () => {
  it("renders glitch tokens deep dive", async () => {
    const { default: GlitchTokensPage } = await import(
      "@/pages/GlitchTokensPage"
    );
    renderWithRouter(<GlitchTokensPage />);

    expect(screen.getByText("Glitch Tokens Deep Dive")).toBeInTheDocument();
    expect(screen.getByText("What Are Glitch Tokens?")).toBeInTheDocument();
  });

  it("displays danger level classification", async () => {
    const { default: GlitchTokensPage } = await import(
      "@/pages/GlitchTokensPage"
    );
    renderWithRouter(<GlitchTokensPage />);

    expect(screen.getByText("Danger Level Classification")).toBeInTheDocument();
    // All three levels should be displayed
    expect(screen.getAllByText("LOW").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("MEDIUM").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("HIGH").length).toBeGreaterThanOrEqual(1);
  });

  it("displays educational disclaimer", async () => {
    const { default: GlitchTokensPage } = await import(
      "@/pages/GlitchTokensPage"
    );
    renderWithRouter(<GlitchTokensPage />);

    expect(screen.getByText(/Educational context/)).toBeInTheDocument();
  });

  it("displays version caveats", async () => {
    const { default: GlitchTokensPage } = await import(
      "@/pages/GlitchTokensPage"
    );
    renderWithRouter(<GlitchTokensPage />);

    expect(screen.getByText("Version Caveats")).toBeInTheDocument();
  });

  it("links to analyzer", async () => {
    const { default: GlitchTokensPage } = await import(
      "@/pages/GlitchTokensPage"
    );
    renderWithRouter(<GlitchTokensPage />);

    expect(screen.getByText("Analyze Text")).toBeInTheDocument();
  });
});
