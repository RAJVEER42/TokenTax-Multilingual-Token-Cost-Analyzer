/**
 * TokenSplitDemo — Interactive tokenization visualizer.
 *
 * Shows how the same text gets split into tokens differently
 * by different tokenizers. Uses hardcoded example data
 * (no API calls) for instant, reliable educational display.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const DEMO_DATA: readonly {
  readonly language: string;
  readonly text: string;
  readonly tokenizers: readonly {
    readonly name: string;
    readonly tokens: readonly string[];
  }[];
}[] = [
  {
    language: "English",
    text: "The quick brown fox",
    tokenizers: [
      { name: "GPT-4o", tokens: ["The", " quick", " brown", " fox"] },
      { name: "LLaMA 3", tokens: ["▁The", "▁quick", "▁brown", "▁fox"] },
      { name: "BERT", tokens: ["the", "quick", "brown", "fox"] },
    ],
  },
  {
    language: "Japanese",
    text: "東京は日本の首都です",
    tokenizers: [
      { name: "GPT-4o", tokens: ["東京", "は", "日本", "の", "首都", "です"] },
      { name: "LLaMA 3", tokens: ["▁", "東", "京", "は", "日本", "の", "首", "都", "です"] },
      { name: "BERT", tokens: ["東", "京", "は", "日", "本", "の", "首", "都", "で", "す"] },
    ],
  },
  {
    language: "Hindi",
    text: "भारत एक विशाल देश है",
    tokenizers: [
      { name: "GPT-4o", tokens: ["भ", "ार", "त", " एक", " व", "िश", "ाल", " दे", "श", " है"] },
      { name: "LLaMA 3", tokens: ["▁", "भ", "ार", "त", "▁", "ए", "क", "▁", "व", "ि", "श", "ा", "ल", "▁", "दे", "श", "▁", "है"] },
      { name: "BERT", tokens: ["भ", "##ार", "##त", "एक", "वि", "##शा", "##ल", "दे", "##श", "है"] },
    ],
  },
  {
    language: "Arabic",
    text: "اللغة العربية جميلة",
    tokenizers: [
      { name: "GPT-4o", tokens: ["الل", "غة", " الع", "رب", "ية", " جم", "يلة"] },
      { name: "LLaMA 3", tokens: ["▁", "ال", "ل", "غ", "ة", "▁", "ال", "ع", "ر", "ب", "ي", "ة", "▁", "ج", "م", "ي", "ل", "ة"] },
      { name: "BERT", tokens: ["الل", "##غة", "العرب", "##ية", "جمي", "##لة"] },
    ],
  },
];

const TOKEN_COLORS = [
  "bg-indigo-500/30 border-indigo-500/50 text-indigo-300",
  "bg-emerald-500/30 border-emerald-500/50 text-emerald-300",
  "bg-amber-500/30 border-amber-500/50 text-amber-300",
  "bg-rose-500/30 border-rose-500/50 text-rose-300",
  "bg-cyan-500/30 border-cyan-500/50 text-cyan-300",
  "bg-purple-500/30 border-purple-500/50 text-purple-300",
  "bg-orange-500/30 border-orange-500/50 text-orange-300",
  "bg-teal-500/30 border-teal-500/50 text-teal-300",
] as const;

function getTokenColor(index: number): string {
  return TOKEN_COLORS[index % TOKEN_COLORS.length]!;
}

export default function TokenSplitDemo() {
  const [selectedLang, setSelectedLang] = useState(0);
  const demo = DEMO_DATA[selectedLang]!;

  return (
    <div className="space-y-4">
      {/* Language selector */}
      <div className="flex gap-2 flex-wrap">
        {DEMO_DATA.map((d, i) => (
          <button
            key={d.language}
            onClick={() => setSelectedLang(i)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              selectedLang === i
                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-white/5 border border-transparent"
            }`}
          >
            {d.language}
          </button>
        ))}
      </div>

      {/* Original text */}
      <div className="glass rounded-lg p-3">
        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Original Text</p>
        <p className="text-white font-medium">{demo.text}</p>
      </div>

      {/* Tokenized views */}
      <AnimatePresence mode="wait">
        <motion.div
          key={demo.language}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="space-y-3"
        >
          {demo.tokenizers.map((tok) => (
            <div key={tok.name} className="glass rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-slate-400">{tok.name}</p>
                <span className="text-[10px] text-slate-500">
                  {tok.tokens.length} tokens
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {tok.tokens.map((token, i) => (
                  <motion.span
                    key={`${tok.name}-${i}-${token}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03, duration: 0.15 }}
                    className={`px-2 py-1 rounded border text-xs font-mono ${getTokenColor(i)}`}
                  >
                    {token}
                  </motion.span>
                ))}
              </div>
            </div>
          ))}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
