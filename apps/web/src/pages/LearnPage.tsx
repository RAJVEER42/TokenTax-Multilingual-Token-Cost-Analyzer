/**
 * LearnPage — Interactive 3-minute tutorial on tokenization economics.
 *
 * Features:
 * - Step-by-step walkthrough with animated transitions (Framer Motion)
 * - Interactive mini demos (token splitting, language comparison, cost calculator)
 * - Progress indicator with step dots
 * - Progress persists in localStorage via useLocalStorage hook
 * - Mobile-friendly, skippable
 * - Keyboard navigable (← → arrows)
 */

import { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  SkipForward,
  RotateCcw,
  Zap,
} from "lucide-react";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { TUTORIAL_STEPS, TOTAL_STEPS } from "@/lib/tutorial-steps";
import type { TutorialProgress } from "@/types";
import TutorialStep from "@/components/learn/TutorialStep";

const INITIAL_PROGRESS: TutorialProgress = {
  currentStep: 0,
  completedSteps: [],
  startedAt: new Date().toISOString(),
};

export default function LearnPage() {
  const [progress, setProgress] = useLocalStorage<TutorialProgress>(
    "tokentax-tutorial-progress",
    INITIAL_PROGRESS,
    2,
  );

  const [currentStep, setCurrentStep] = useState(progress.currentStep);
  const [direction, setDirection] = useState(1);

  const isFirst = currentStep === 0;
  const isLast = currentStep === TOTAL_STEPS - 1;

  // Persist progress on step change
  useEffect(() => {
    setProgress((prev) => ({
      ...prev,
      currentStep,
      completedSteps: Array.from(
        new Set([...prev.completedSteps, currentStep]),
      ),
    }));
  }, [currentStep, setProgress]);

  const goNext = useCallback(() => {
    if (!isLast) {
      setDirection(1);
      setCurrentStep((s) => s + 1);
    }
  }, [isLast]);

  const goPrev = useCallback(() => {
    if (!isFirst) {
      setDirection(-1);
      setCurrentStep((s) => s - 1);
    }
  }, [isFirst]);

  const skipToEnd = useCallback(() => {
    setDirection(1);
    setCurrentStep(TOTAL_STEPS - 1);
  }, []);

  const restart = useCallback(() => {
    setDirection(-1);
    setCurrentStep(0);
    setProgress({
      currentStep: 0,
      completedSteps: [],
      startedAt: new Date().toISOString(),
    });
  }, [setProgress]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  const step = TUTORIAL_STEPS[currentStep]!;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold text-white">Learn: Token Economics</h1>
        <p className="text-slate-400 mt-1">
          A 3-minute interactive guide to tokenization, BPE bias, and the multilingual tax.
        </p>
      </header>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>Step {currentStep + 1} of {TOTAL_STEPS}</span>
          <span>{Math.round(((currentStep + 1) / TOTAL_STEPS) * 100)}% complete</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        {/* Step dots */}
        <div className="flex justify-center gap-2">
          {TUTORIAL_STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => {
                setDirection(i > currentStep ? 1 : -1);
                setCurrentStep(i);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentStep
                  ? "bg-indigo-400 scale-125"
                  : i < currentStep
                    ? "bg-indigo-500/40"
                    : "bg-white/10"
              }`}
              aria-label={`Go to step ${i + 1}: ${s.title}`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="glass rounded-xl p-6 min-h-[400px]">
        <AnimatePresence mode="wait" initial={false}>
          <TutorialStep step={step} direction={direction} />
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={goPrev}
          disabled={isFirst}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed text-slate-400 hover:text-white hover:bg-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
          Previous
        </button>

        <div className="flex items-center gap-2">
          {!isLast && (
            <button
              onClick={skipToEnd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-all"
            >
              <SkipForward className="w-3 h-3" />
              Skip tutorial
            </button>
          )}
          {isLast && (
            <button
              onClick={restart}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-300 transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              Restart
            </button>
          )}
        </div>

        {isLast ? (
          <Link
            to="/analyze"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            Start Analyzing
            <Zap className="w-4 h-4" />
          </Link>
        ) : (
          <button
            onClick={goNext}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
          >
            Next
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
