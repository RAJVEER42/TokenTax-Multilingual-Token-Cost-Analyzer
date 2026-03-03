/**
 * CostCalculatorDemo — Interactive cost multiplier calculator.
 *
 * Lets users input a token count and see how costs scale
 * across different tokenizers and languages.
 */

import { useState } from "react";
import { motion } from "framer-motion";
import { TOKENIZER_PRICING, calculateCost, COST_DECIMAL_PLACES } from "@/lib/constants";

const MULTIPLIERS: readonly { readonly label: string; readonly factor: number }[] = [
  { label: "English (1×)", factor: 1.0 },
  { label: "Spanish (1.2×)", factor: 1.2 },
  { label: "Japanese (2×)", factor: 2.0 },
  { label: "Hindi (3×)", factor: 3.0 },
  { label: "Tamil (4×)", factor: 4.0 },
];

export default function CostCalculatorDemo() {
  const [baseTokens, setBaseTokens] = useState(1000);
  const [selectedMultiplier, setSelectedMultiplier] = useState(0);
  const factor = MULTIPLIERS[selectedMultiplier]!.factor;
  const effectiveTokens = Math.round(baseTokens * factor);

  return (
    <div className="space-y-4">
      {/* Token count input */}
      <div className="space-y-1">
        <label className="text-xs text-slate-400" htmlFor="token-input">
          Base token count (English)
        </label>
        <input
          id="token-input"
          type="number"
          min={1}
          max={10_000_000}
          value={baseTokens}
          onChange={(e) => setBaseTokens(Math.max(1, Number(e.target.value)))}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-indigo-500/50"
        />
      </div>

      {/* Language multiplier selector */}
      <div className="flex gap-2 flex-wrap">
        {MULTIPLIERS.map((m, i) => (
          <button
            key={m.label}
            onClick={() => setSelectedMultiplier(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedMultiplier === i
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Cost breakdown */}
      <motion.div
        key={`${baseTokens}-${selectedMultiplier}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="space-y-2"
      >
        {TOKENIZER_PRICING.map((pricing) => {
          const cost = calculateCost(effectiveTokens, pricing.costPerMToken);
          const englishCost = calculateCost(baseTokens, pricing.costPerMToken);
          const premium = factor > 1 ? cost - englishCost : 0;
          return (
            <div key={pricing.name} className="glass rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">{pricing.displayName}</span>
                <span className="text-xs font-mono text-white">
                  ${cost.toFixed(COST_DECIMAL_PLACES)}
                </span>
              </div>
              {premium > 0 && (
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-slate-500">
                    {effectiveTokens.toLocaleString()} effective tokens
                  </span>
                  <span className="text-[10px] text-red-400">
                    +${premium.toFixed(COST_DECIMAL_PLACES)} tax
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}
