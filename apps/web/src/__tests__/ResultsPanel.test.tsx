/**
 * ResultsPanel Component Tests — Phase 9
 *
 * Validates:
 * - Loading state (spinner + "Analyzing text…")
 * - Empty state (renders nothing)
 * - Table rendering with correct data in cells
 * - Efficiency indicators: Efficient (<0.3), Average (0.3–0.8), Expensive (>0.8)
 * - Confidence badges: EXACT (emerald), ESTIMATED (amber)
 * - Multiple results rendering
 * - Mobile card layout rendering
 */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ResultsPanel from "@/components/ResultsPanel";
import type { TokenAnalysis } from "@/types";

// ── Fixtures ───────────────────────────────────────────

const efficientResult: TokenAnalysis = {
  tokenizer_name: "tiktoken",
  tokenizer_version: "0.7.0",
  token_count: 42,
  char_count: 200,
  efficiency_ratio: 0.21,
  confidence: "EXACT",
  language: "en",
  error: null,
};

const averageResult: TokenAnalysis = {
  tokenizer_name: "sentencepiece",
  tokenizer_version: "1.0.0",
  token_count: 100,
  char_count: 200,
  efficiency_ratio: 0.5,
  confidence: "ESTIMATED",
  language: "en",
  error: null,
};

const expensiveResult: TokenAnalysis = {
  tokenizer_name: "huggingface",
  tokenizer_version: "4.38.0",
  token_count: 180,
  char_count: 200,
  efficiency_ratio: 0.9,
  confidence: "EXACT",
  language: "ta",
  error: null,
};

// ── Loading State ──────────────────────────────────────

describe("ResultsPanel", () => {
  describe("loading state", () => {
    it("shows loading spinner and message", () => {
      render(<ResultsPanel results={[]} loading />);

      expect(screen.getByText("Analyzing text…")).toBeInTheDocument();
    });

    it("does not show table when loading", () => {
      render(<ResultsPanel results={[efficientResult]} loading />);

      expect(screen.queryByText("Tokenization Results")).not.toBeInTheDocument();
    });
  });

  // ── Empty State ────────────────────────────────────────

  describe("empty state", () => {
    it("renders nothing when results are empty and not loading", () => {
      const { container } = render(
        <ResultsPanel results={[]} loading={false} />,
      );

      expect(container.innerHTML).toBe("");
    });
  });

  // ── Table Rendering ────────────────────────────────────

  describe("table rendering", () => {
    it("renders tokenization results heading", () => {
      render(<ResultsPanel results={[efficientResult]} />);

      expect(screen.getByText("Tokenization Results")).toBeInTheDocument();
    });

    it("shows count of tokenizers analyzed", () => {
      render(<ResultsPanel results={[efficientResult, averageResult]} />);

      expect(screen.getByText("2 tokenizers analyzed")).toBeInTheDocument();
    });

    it("shows singular form for single tokenizer", () => {
      render(<ResultsPanel results={[efficientResult]} />);

      expect(screen.getByText("1 tokenizer analyzed")).toBeInTheDocument();
    });

    it("displays tokenizer name and version", () => {
      render(<ResultsPanel results={[efficientResult]} />);

      // Desktop table + mobile card both render the name
      expect(screen.getAllByText("tiktoken").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("v0.7.0").length).toBeGreaterThanOrEqual(1);
    });

    it("displays token count formatted with locale separators", () => {
      const bigResult: TokenAnalysis = {
        ...efficientResult,
        token_count: 12_345,
      };
      render(<ResultsPanel results={[bigResult]} />);

      // "12,345" appears at least once (desktop + mobile)
      expect(screen.getAllByText("12,345").length).toBeGreaterThanOrEqual(1);
    });

    it("displays efficiency ratio with 4 decimal places", () => {
      render(<ResultsPanel results={[efficientResult]} />);

      // 0.21 → "0.2100"
      expect(screen.getAllByText("0.2100").length).toBeGreaterThanOrEqual(1);
    });

    it("renders all results as rows", () => {
      render(
        <ResultsPanel
          results={[efficientResult, averageResult, expensiveResult]}
        />,
      );

      // Desktop + mobile both render names, so use getAllByText
      expect(screen.getAllByText("tiktoken").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("sentencepiece").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("huggingface").length).toBeGreaterThanOrEqual(1);
    });
  });

  // ── Confidence Badges ──────────────────────────────────

  describe("confidence badges", () => {
    it("renders EXACT badge with emerald styling", () => {
      render(<ResultsPanel results={[efficientResult]} />);

      const badges = screen.getAllByText("EXACT");
      expect(badges.length).toBeGreaterThanOrEqual(1);
      // Check at least one badge has emerald class
      const hasEmerald = badges.some((b) =>
        b.className.includes("text-emerald-400"),
      );
      expect(hasEmerald).toBe(true);
    });

    it("renders ESTIMATED badge with amber styling", () => {
      render(<ResultsPanel results={[averageResult]} />);

      const badges = screen.getAllByText("ESTIMATED");
      expect(badges.length).toBeGreaterThanOrEqual(1);
      const hasAmber = badges.some((b) =>
        b.className.includes("text-amber-400"),
      );
      expect(hasAmber).toBe(true);
    });
  });

  // ── Efficiency Indicators ──────────────────────────────

  describe("efficiency indicators", () => {
    it("shows 'Efficient' for ratio < 0.3", () => {
      render(<ResultsPanel results={[efficientResult]} />);

      expect(screen.getByText("Efficient")).toBeInTheDocument();
    });

    it("shows 'Average' for ratio between 0.3 and 0.8", () => {
      render(<ResultsPanel results={[averageResult]} />);

      expect(screen.getByText("Average")).toBeInTheDocument();
    });

    it("shows 'Expensive' for ratio > 0.8", () => {
      render(<ResultsPanel results={[expensiveResult]} />);

      expect(screen.getByText("Expensive")).toBeInTheDocument();
    });

    it("shows all three indicators for mixed results", () => {
      render(
        <ResultsPanel
          results={[efficientResult, averageResult, expensiveResult]}
        />,
      );

      expect(screen.getByText("Efficient")).toBeInTheDocument();
      expect(screen.getByText("Average")).toBeInTheDocument();
      expect(screen.getByText("Expensive")).toBeInTheDocument();
    });
  });

  // ── Mobile Cards ───────────────────────────────────────

  describe("mobile cards", () => {
    it("renders mobile card labels (Tokens, Chars, Ratio)", () => {
      render(<ResultsPanel results={[efficientResult]} />);

      // Mobile cards contain these labels
      expect(screen.getAllByText("Tokens").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Chars").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Ratio").length).toBeGreaterThanOrEqual(1);
    });
  });
});
