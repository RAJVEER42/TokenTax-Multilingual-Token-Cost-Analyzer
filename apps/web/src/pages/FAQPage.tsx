/**
 * FAQPage — High-signal, evidence-based FAQ.
 *
 * Features:
 * - ≥10 precise, nuanced answers
 * - Expandable accordion pattern
 * - Evidence citations where available
 * - Accessible (ARIA expanded, keyboard navigable)
 * - Smooth animations via Framer Motion
 */

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";
import { FAQ_ITEMS } from "@/lib/faq-data";

function FAQAccordion({
  question,
  answer,
  evidence,
  isOpen,
  onToggle,
}: {
  readonly question: string;
  readonly answer: string;
  readonly evidence?: string;
  readonly isOpen: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <div className="glass rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-5 text-left"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium text-white pr-4">{question}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown className="w-4 h-4 text-slate-400" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-5 pb-5 space-y-2">
              <p className="text-sm text-slate-300 leading-relaxed">{answer}</p>
              {evidence && (
                <p className="text-xs text-slate-500 italic border-l-2 border-indigo-500/30 pl-3 mt-2">
                  {evidence}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FAQPage() {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const toggleFAQ = useCallback((id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    setOpenIds(new Set(FAQ_ITEMS.map((f) => f.id)));
  }, []);

  const collapseAll = useCallback(() => {
    setOpenIds(new Set());
  }, []);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/15 flex items-center justify-center">
            <HelpCircle className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Frequently Asked Questions</h1>
            <p className="text-slate-400 text-sm">
              Evidence-based answers to common questions about tokenization and the multilingual tax.
            </p>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={expandAll}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Expand all
          </button>
          <span className="text-xs text-slate-600">·</span>
          <button
            onClick={collapseAll}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Collapse all
          </button>
        </div>
      </header>

      <div className="space-y-3">
        {FAQ_ITEMS.map((faq) => (
          <FAQAccordion
            key={faq.id}
            question={faq.question}
            answer={faq.answer}
            evidence={faq.evidence}
            isOpen={openIds.has(faq.id)}
            onToggle={() => toggleFAQ(faq.id)}
          />
        ))}
      </div>

      {/* CTA to deeper content */}
      <div className="glass rounded-xl p-6 text-center">
        <p className="text-sm text-slate-400 mb-3">
          Want to understand the methodology in depth?
        </p>
        <Link
          to="/research"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
        >
          <BookOpen className="w-4 h-4" />
          Read the Research
        </Link>
      </div>
    </div>
  );
}
