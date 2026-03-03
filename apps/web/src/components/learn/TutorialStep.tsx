/**
 * TutorialStep — Renders a single tutorial step with appropriate demo.
 *
 * Maps step type → interactive demo component via lazy loading.
 * Handles animated transitions between steps.
 */

import { lazy, Suspense } from "react";
import { motion } from "framer-motion";
import { BookOpen, Cpu, Layers, Globe, Scale, Rocket } from "lucide-react";
import type { TutorialStepDef } from "@/lib/tutorial-steps";

const TokenSplitDemo = lazy(() => import("@/components/learn/TokenSplitDemo"));
const LanguageComparisonSlider = lazy(() => import("@/components/learn/LanguageComparisonSlider"));
const CostCalculatorDemo = lazy(() => import("@/components/learn/CostCalculatorDemo"));

const STEP_ICONS: Record<TutorialStepDef["type"], typeof BookOpen> = {
  intro: BookOpen,
  tokenization: Cpu,
  bpe: Layers,
  multilingual: Globe,
  fairness: Scale,
  summary: Rocket,
};

function DemoLoader() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function FairnessFormulaDemo() {
  return (
    <div className="space-y-3">
      <div className="glass rounded-lg p-4">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Token Ratio</p>
        <p className="font-mono text-sm text-indigo-300">
          ratio = (tokens_language / tokens_english) × 100
        </p>
        <p className="text-xs text-slate-500 mt-1">English = 100 (baseline)</p>
      </div>
      <div className="glass rounded-lg p-4">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Fairness Score</p>
        <p className="font-mono text-sm text-indigo-300">
          score = max(0, 100 − (ratio − 100))
        </p>
        <p className="text-xs text-slate-500 mt-1">
          0 = extremely biased · 100 = perfectly fair
        </p>
      </div>
      <div className="glass rounded-lg p-4">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Example</p>
        <div className="space-y-1 text-xs text-slate-300">
          <p>Hindi text: 36 tokens · English equivalent: 12 tokens</p>
          <p className="font-mono text-amber-400">ratio = (36/12) × 100 = 300</p>
          <p className="font-mono text-red-400">score = max(0, 100 − 200) = 0</p>
          <p className="text-slate-500 mt-1">This indicates extreme tokenization bias.</p>
        </div>
      </div>
    </div>
  );
}

function renderDemo(type: TutorialStepDef["type"]) {
  switch (type) {
    case "tokenization":
      return (
        <Suspense fallback={<DemoLoader />}>
          <TokenSplitDemo />
        </Suspense>
      );
    case "multilingual":
      return (
        <Suspense fallback={<DemoLoader />}>
          <LanguageComparisonSlider />
        </Suspense>
      );
    case "fairness":
      return <FairnessFormulaDemo />;
    case "summary":
      return (
        <Suspense fallback={<DemoLoader />}>
          <CostCalculatorDemo />
        </Suspense>
      );
    default:
      return null;
  }
}

export default function TutorialStep({
  step,
  direction,
}: {
  readonly step: TutorialStepDef;
  readonly direction: number;
}) {
  const Icon = STEP_ICONS[step.type];

  return (
    <motion.div
      key={step.id}
      initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center">
          <Icon className="w-5 h-5 text-indigo-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">{step.title}</h2>
          <p className="text-xs text-slate-500">{step.subtitle}</p>
        </div>
      </div>

      {/* Description */}
      <p className="text-slate-300 text-sm leading-relaxed">
        {step.description}
      </p>

      {/* Interactive demo (if applicable) */}
      {renderDemo(step.type)}
    </motion.div>
  );
}
