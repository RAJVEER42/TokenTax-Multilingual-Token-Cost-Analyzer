/**
 * LanguageComparisonSlider — Interactive cost multiplier comparison.
 *
 * Lets users slide between languages to see how token counts
 * and costs change relative to English. Educational demonstration
 * using representative hardcoded data.
 */

import { useState } from "react";
import { motion } from "framer-motion";

interface LanguageExample {
  readonly code: string;
  readonly name: string;
  readonly tokenCount: number;
  readonly multiplier: number;
}

const ENGLISH_BASELINE_TOKENS = 12;

const LANGUAGES: readonly LanguageExample[] = [
  { code: "en", name: "English",    tokenCount: 12,  multiplier: 1.0 },
  { code: "es", name: "Spanish",    tokenCount: 14,  multiplier: 1.17 },
  { code: "fr", name: "French",     tokenCount: 15,  multiplier: 1.25 },
  { code: "de", name: "German",     tokenCount: 14,  multiplier: 1.17 },
  { code: "ru", name: "Russian",    tokenCount: 22,  multiplier: 1.83 },
  { code: "ar", name: "Arabic",     tokenCount: 28,  multiplier: 2.33 },
  { code: "zh", name: "Chinese",    tokenCount: 18,  multiplier: 1.50 },
  { code: "ja", name: "Japanese",   tokenCount: 24,  multiplier: 2.00 },
  { code: "hi", name: "Hindi",      tokenCount: 36,  multiplier: 3.00 },
  { code: "ko", name: "Korean",     tokenCount: 26,  multiplier: 2.17 },
  { code: "ta", name: "Tamil",      tokenCount: 48,  multiplier: 4.00 },
  { code: "bn", name: "Bengali",    tokenCount: 40,  multiplier: 3.33 },
];

const COST_PER_MILLION = 2.50; // GPT-4o pricing

function formatCost(tokens: number): string {
  return ((tokens / 1_000_000) * COST_PER_MILLION * 1_000_000).toFixed(2);
}

export default function LanguageComparisonSlider() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const lang = LANGUAGES[selectedIndex]!;
  const barMaxWidth = 100;

  return (
    <div className="space-y-4">
      {/* Slider */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-slate-500">
          <span>English (baseline)</span>
          <span>Tamil (4× cost)</span>
        </div>
        <input
          type="range"
          min={0}
          max={LANGUAGES.length - 1}
          value={selectedIndex}
          onChange={(e) => setSelectedIndex(Number(e.target.value))}
          className="w-full accent-indigo-500"
          aria-label="Select language for comparison"
        />
      </div>

      {/* Selected language info */}
      <motion.div
        key={lang.code}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass rounded-lg p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-white font-semibold">{lang.name}</h4>
          <span className={`text-sm font-mono ${
            lang.multiplier <= 1.2 ? "text-emerald-400" :
            lang.multiplier <= 2.0 ? "text-amber-400" : "text-red-400"
          }`}>
            {lang.multiplier}× cost
          </span>
        </div>

        {/* Token count bar */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-16">English</span>
            <div className="flex-1 bg-white/5 rounded-full h-4 overflow-hidden">
              <div
                className="h-full bg-emerald-500/50 rounded-full"
                style={{ width: `${(ENGLISH_BASELINE_TOKENS / 48) * barMaxWidth}%` }}
              />
            </div>
            <span className="text-xs text-slate-400 w-16 text-right">{ENGLISH_BASELINE_TOKENS} tokens</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 w-16">{lang.name}</span>
            <div className="flex-1 bg-white/5 rounded-full h-4 overflow-hidden">
              <motion.div
                className={`h-full rounded-full ${
                  lang.multiplier <= 1.2 ? "bg-emerald-500/50" :
                  lang.multiplier <= 2.0 ? "bg-amber-500/50" : "bg-red-500/50"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${(lang.tokenCount / 48) * barMaxWidth}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-xs text-slate-400 w-16 text-right">{lang.tokenCount} tokens</span>
          </div>
        </div>

        {/* Cost comparison */}
        <div className="mt-3 pt-3 border-t border-white/6 flex justify-between text-xs">
          <span className="text-slate-500">
            Cost per 1M tokens: ${COST_PER_MILLION.toFixed(2)}
          </span>
          <span className="text-slate-400">
            Effective cost: <span className="text-white font-medium">${formatCost(lang.tokenCount)}</span>
            {" "}vs <span className="text-emerald-400">${formatCost(ENGLISH_BASELINE_TOKENS)}</span>
          </span>
        </div>
      </motion.div>
    </div>
  );
}
