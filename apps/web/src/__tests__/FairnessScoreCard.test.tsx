/**
 * FairnessScoreCard Component Tests — Phase 9
 *
 * Validates:
 * - Score threshold labels: Excellent (≥90), Good (≥70), Moderate (≥50), Poor (≥25), Severe (<25)
 * - Color coding per threshold (emerald, green, amber, red)
 * - Tooltip toggle on info button click
 * - Tooltip content and role
 * - Formula version display
 * - Token ratio display
 * - showInfo=false hides info button
 * - Tokenizer name display
 */

import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import FairnessScoreCard from "@/components/FairnessScoreCard";
import type { FairnessResult } from "@/types";

// ── Fixture Factory ────────────────────────────────────

function makeFairness(overrides: Partial<FairnessResult> = {}): FairnessResult {
  return {
    tokenizer_name: "tiktoken",
    fairness_score: 85,
    token_ratio: 12.5,
    formula_version: "2.0",
    ...overrides,
  };
}

// ── Score Threshold Labels ─────────────────────────────

describe("FairnessScoreCard", () => {
  describe("score thresholds", () => {
    it("shows 'Excellent' for score ≥ 90", () => {
      render(<FairnessScoreCard result={makeFairness({ fairness_score: 95 })} />);
      expect(screen.getByText("Excellent")).toBeInTheDocument();
    });

    it("shows 'Good' for score 70–89", () => {
      render(<FairnessScoreCard result={makeFairness({ fairness_score: 75 })} />);
      expect(screen.getByText("Good")).toBeInTheDocument();
    });

    it("shows 'Moderate' for score 50–69", () => {
      render(<FairnessScoreCard result={makeFairness({ fairness_score: 55 })} />);
      expect(screen.getByText("Moderate")).toBeInTheDocument();
    });

    it("shows 'Poor' for score 25–49", () => {
      render(<FairnessScoreCard result={makeFairness({ fairness_score: 30 })} />);
      expect(screen.getByText("Poor")).toBeInTheDocument();
    });

    it("shows 'Severe Bias' for score < 25", () => {
      render(<FairnessScoreCard result={makeFairness({ fairness_score: 10 })} />);
      expect(screen.getByText("Severe Bias")).toBeInTheDocument();
    });

    it("handles exact boundary at 90", () => {
      render(<FairnessScoreCard result={makeFairness({ fairness_score: 90 })} />);
      expect(screen.getByText("Excellent")).toBeInTheDocument();
    });

    it("handles exact boundary at 70", () => {
      render(<FairnessScoreCard result={makeFairness({ fairness_score: 70 })} />);
      expect(screen.getByText("Good")).toBeInTheDocument();
    });

    it("handles exact boundary at 50", () => {
      render(<FairnessScoreCard result={makeFairness({ fairness_score: 50 })} />);
      expect(screen.getByText("Moderate")).toBeInTheDocument();
    });

    it("handles exact boundary at 25", () => {
      render(<FairnessScoreCard result={makeFairness({ fairness_score: 25 })} />);
      expect(screen.getByText("Poor")).toBeInTheDocument();
    });

    it("handles score of 0", () => {
      render(<FairnessScoreCard result={makeFairness({ fairness_score: 0 })} />);
      expect(screen.getByText("Severe Bias")).toBeInTheDocument();
    });

    it("handles score of 100", () => {
      render(<FairnessScoreCard result={makeFairness({ fairness_score: 100 })} />);
      expect(screen.getByText("Excellent")).toBeInTheDocument();
    });
  });

  // ── Color Coding ───────────────────────────────────────

  describe("color coding", () => {
    it("uses emerald for Excellent scores", () => {
      const { container } = render(
        <FairnessScoreCard result={makeFairness({ fairness_score: 95 })} />,
      );
      const card = container.firstElementChild as HTMLElement;
      expect(card.className).toContain("border-emerald-500");
    });

    it("uses green for Good scores", () => {
      const { container } = render(
        <FairnessScoreCard result={makeFairness({ fairness_score: 75 })} />,
      );
      const card = container.firstElementChild as HTMLElement;
      expect(card.className).toContain("border-green-500");
    });

    it("uses amber for Moderate scores", () => {
      const { container } = render(
        <FairnessScoreCard result={makeFairness({ fairness_score: 55 })} />,
      );
      const card = container.firstElementChild as HTMLElement;
      expect(card.className).toContain("border-amber-500");
    });

    it("uses red for Poor scores", () => {
      const { container } = render(
        <FairnessScoreCard result={makeFairness({ fairness_score: 30 })} />,
      );
      const card = container.firstElementChild as HTMLElement;
      expect(card.className).toContain("border-red-500");
    });

    it("uses dark red for Severe scores", () => {
      const { container } = render(
        <FairnessScoreCard result={makeFairness({ fairness_score: 10 })} />,
      );
      const card = container.firstElementChild as HTMLElement;
      expect(card.className).toContain("border-red-600");
    });
  });

  // ── Data Display ───────────────────────────────────────

  describe("data display", () => {
    it("displays the tokenizer name", () => {
      render(
        <FairnessScoreCard
          result={makeFairness({ tokenizer_name: "sentencepiece" })}
        />,
      );
      expect(screen.getByText("sentencepiece")).toBeInTheDocument();
    });

    it("displays the score with one decimal", () => {
      render(<FairnessScoreCard result={makeFairness({ fairness_score: 85.3 })} />);
      expect(screen.getByText("85.3")).toBeInTheDocument();
    });

    it("displays /100 suffix", () => {
      render(<FairnessScoreCard result={makeFairness()} />);
      expect(screen.getByText("/100")).toBeInTheDocument();
    });

    it("displays the token ratio", () => {
      render(<FairnessScoreCard result={makeFairness({ token_ratio: 42.7 })} />);
      expect(screen.getByText(/ratio: 42\.7%/)).toBeInTheDocument();
    });

    it("displays the formula version", () => {
      render(
        <FairnessScoreCard
          result={makeFairness({ formula_version: "3.1" })}
        />,
      );
      expect(screen.getByText("Formula v3.1")).toBeInTheDocument();
    });
  });

  // ── Tooltip ────────────────────────────────────────────

  describe("tooltip", () => {
    it("does not show tooltip by default", () => {
      render(<FairnessScoreCard result={makeFairness()} />);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("shows tooltip on info button click", () => {
      render(<FairnessScoreCard result={makeFairness()} />);

      const infoButton = screen.getByLabelText("Fairness score information");
      fireEvent.click(infoButton);

      expect(screen.getByRole("tooltip")).toBeInTheDocument();
      expect(screen.getByText("Fairness Score")).toBeInTheDocument();
      expect(screen.getByText(/equitably this tokenizer/)).toBeInTheDocument();
    });

    it("toggles tooltip off on second click", () => {
      render(<FairnessScoreCard result={makeFairness()} />);

      const infoButton = screen.getByLabelText("Fairness score information");
      fireEvent.click(infoButton);
      expect(screen.getByRole("tooltip")).toBeInTheDocument();

      fireEvent.click(infoButton);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });

    it("hides tooltip on blur", () => {
      render(<FairnessScoreCard result={makeFairness()} />);

      const infoButton = screen.getByLabelText("Fairness score information");
      fireEvent.click(infoButton);
      expect(screen.getByRole("tooltip")).toBeInTheDocument();

      fireEvent.blur(infoButton);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
    });
  });

  // ── showInfo Prop ──────────────────────────────────────

  describe("showInfo prop", () => {
    it("shows info button by default", () => {
      render(<FairnessScoreCard result={makeFairness()} />);
      expect(
        screen.getByLabelText("Fairness score information"),
      ).toBeInTheDocument();
    });

    it("hides info button when showInfo=false", () => {
      render(
        <FairnessScoreCard result={makeFairness()} showInfo={false} />,
      );
      expect(
        screen.queryByLabelText("Fairness score information"),
      ).not.toBeInTheDocument();
    });
  });
});
