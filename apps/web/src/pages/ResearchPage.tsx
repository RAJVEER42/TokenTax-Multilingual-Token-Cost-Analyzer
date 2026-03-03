/**
 * ResearchPage — Peer-review style methodology documentation.
 *
 * Academic tone with formula breakdowns, citations,
 * statistical methodology, known limitations, and
 * reproducibility guarantees.
 */

import { FileText, FlaskConical, BarChart3, AlertTriangle, Shield, GitBranch } from "lucide-react";

function Section({
  icon: Icon,
  title,
  children,
}: {
  readonly icon: typeof FileText;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/15 flex items-center justify-center">
          <Icon className="w-4 h-4 text-indigo-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Formula({ label, formula, note }: {
  readonly label: string;
  readonly formula: string;
  readonly note?: string;
}) {
  return (
    <div className="bg-slate-900/60 border border-white/6 rounded-lg p-4">
      <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">{label}</p>
      <p className="font-mono text-sm text-indigo-300">{formula}</p>
      {note && <p className="text-xs text-slate-500 mt-2">{note}</p>}
    </div>
  );
}

function Citation({ id, text }: { readonly id: number; readonly text: string }) {
  return (
    <li className="text-xs text-slate-400">
      <span className="text-slate-500">[{id}]</span> {text}
    </li>
  );
}

export default function ResearchPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-white">Research Methodology</h1>
        <p className="text-slate-400 mt-1">
          Technical documentation of TokenTax&apos;s analysis methodology, formulas,
          and statistical approach. Written for peer review.
        </p>
        <div className="flex gap-3 mt-3">
          <span className="text-xs bg-indigo-500/15 text-indigo-400 px-2 py-1 rounded">
            Formula v1.0.0
          </span>
          <span className="text-xs bg-white/5 text-slate-400 px-2 py-1 rounded">
            Last updated: March 2026
          </span>
        </div>
      </header>

      {/* Abstract */}
      <Section icon={FileText} title="Abstract">
        <p className="text-sm text-slate-300 leading-relaxed">
          TokenTax measures the economic cost disparity created by subword tokenization
          across languages. Modern LLMs employ Byte-Pair Encoding (BPE) or similar
          algorithms trained predominantly on English corpora, producing systematically
          higher token counts — and therefore higher API costs — for non-English text.
          This tool quantifies this &quot;multilingual tax&quot; using a fairness scoring
          framework that compares per-tokenizer token counts against an English baseline.
        </p>
      </Section>

      {/* Core Formulas */}
      <Section icon={FlaskConical} title="Core Formulas">
        <div className="space-y-3">
          <Formula
            label="Token Ratio (per tokenizer)"
            formula="token_ratio = (tokens_lang / tokens_en) × 100"
            note="Where tokens_lang is the token count for the target language, and tokens_en is the count for the same text in English. English always equals 100."
          />
          <Formula
            label="Fairness Score (per tokenizer)"
            formula="fairness_score = clamp(100 − (token_ratio − 100), 0, 100)"
            note="Clamped to [0, 100]. A score of 100 indicates perfect parity with English. A score of 0 indicates the target language uses ≥2× more tokens."
          />
          <Formula
            label="Cost Calculation"
            formula="cost = (token_count / 1,000,000) × cost_per_million_tokens"
            note="Uses immutable pricing snapshots versioned by date (e.g., 2026-03-01). Pricing is never auto-updated to ensure reproducibility."
          />
          <Formula
            label="Efficiency Ratio"
            formula="efficiency = token_count / char_count"
            note="Lower values indicate more efficient tokenization. English typically achieves 0.2–0.4; CJK scripts may reach 1.0+."
          />
        </div>
      </Section>

      {/* Statistical Methodology */}
      <Section icon={BarChart3} title="Statistical Methodology">
        <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
          <h3 className="text-white font-medium">Why Median Over Mean</h3>
          <p>
            When aggregating fairness scores across tokenizers, TokenTax uses the
            <strong className="text-white"> median</strong> rather than the arithmetic mean.
            Tokenizer token counts follow a skewed distribution — a single outlier tokenizer
            (e.g., one that byte-encodes all non-ASCII) can dramatically inflate the mean.
            The median is robust to such outliers and provides a more representative central tendency.
          </p>

          <h3 className="text-white font-medium mt-4">Unicode Normalization</h3>
          <p>
            All input text is normalized to <strong className="text-white">NFC</strong>{" "}
            (Canonical Decomposition followed by Canonical Composition) before tokenization.
            This ensures that visually identical characters (e.g., é as a single code point vs.
            e + combining accent) produce consistent token counts. Without normalization,
            identical text could yield different results based on encoding.
          </p>

          <h3 className="text-white font-medium mt-4">Pricing Snapshot Immutability</h3>
          <p>
            API pricing data is stored as immutable, date-versioned snapshots. When providers
            change their pricing, we create a new snapshot version rather than updating existing
            data. This ensures that any cost calculation can be exactly reproduced by referencing
            the snapshot version used.
          </p>

          <h3 className="text-white font-medium mt-4">Confidence Levels</h3>
          <p>
            Each tokenizer adapter reports a confidence level:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
            <li>
              <strong className="text-emerald-400">EXACT</strong> — Uses the official tokenizer
              library (tiktoken, SentencePiece). Counts are deterministic.
            </li>
            <li>
              <strong className="text-amber-400">ESTIMATED</strong> — Uses a heuristic
              approximation (e.g., Claude adapter). Accuracy within ±15%.
            </li>
          </ul>
        </div>
      </Section>

      {/* Known Limitations */}
      <Section icon={AlertTriangle} title="Known Limitations">
        <ul className="space-y-2 text-sm text-slate-400">
          <li className="flex gap-2">
            <span className="text-amber-400 shrink-0">•</span>
            <span>
              <strong className="text-slate-300">Translation equivalence:</strong>{" "}
              We compare the same text across languages, not semantically equivalent
              translations. This measures tokenizer behavior on the same byte sequences,
              not communicative cost parity.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-400 shrink-0">•</span>
            <span>
              <strong className="text-slate-300">Heuristic adapters:</strong>{" "}
              Claude and some other tokenizers lack public tokenizer libraries.
              Our heuristic estimates are within ±15% but not exact.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-400 shrink-0">•</span>
            <span>
              <strong className="text-slate-300">Tokenizer version drift:</strong>{" "}
              Tokenizer vocabularies may change between model versions. Results are pinned
              to the specific library versions documented in each response&apos;s metadata.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-400 shrink-0">•</span>
            <span>
              <strong className="text-slate-300">Scope:</strong>{" "}
              TokenTax measures input tokenization cost only. Output token generation,
              context window utilization, and prompt engineering effects are not modeled.
            </span>
          </li>
          <li className="flex gap-2">
            <span className="text-amber-400 shrink-0">•</span>
            <span>
              <strong className="text-slate-300">16 languages:</strong>{" "}
              Coverage is limited to 16 languages. Many under-resourced languages
              (e.g., Yoruba, Tagalog, Khmer) likely face even greater tokenization disparities.
            </span>
          </li>
        </ul>
      </Section>

      {/* Reproducibility */}
      <Section icon={Shield} title="Reproducibility Guarantees">
        <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
          <p>
            Every analysis response includes a <code className="text-indigo-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">formula_version</code>{" "}
            field. Given the same input text, language, formula version, and tokenizer library
            versions, results are deterministic and bit-for-bit reproducible.
          </p>
          <p>
            All floating-point outputs are rounded to 6 decimal places to prevent platform-dependent
            serialization differences.
          </p>
        </div>
      </Section>

      {/* Versioning Policy */}
      <Section icon={GitBranch} title="Versioning Policy">
        <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
          <p>
            The <code className="text-indigo-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">formula_version</code>{" "}
            follows semantic versioning:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
            <li><strong className="text-white">Major:</strong> Breaking changes to the fairness formula (scores are not comparable across major versions).</li>
            <li><strong className="text-white">Minor:</strong> New tokenizers, additional languages, or enriched metadata.</li>
            <li><strong className="text-white">Patch:</strong> Bug fixes that do not affect scoring.</li>
          </ul>
        </div>
      </Section>

      {/* References */}
      <section className="glass rounded-xl p-6 space-y-3">
        <h2 className="text-lg font-semibold text-white">References</h2>
        <ol className="space-y-2">
          <Citation id={1} text='Sennrich, R., Haddow, B., & Birch, A. (2016). "Neural Machine Translation of Rare Words with Subword Units." ACL 2016.' />
          <Citation id={2} text='Petrov, A. et al. (2023). "Language Model Tokenizers Introduce Unfairness Between Languages." NeurIPS 2023.' />
          <Citation id={3} text='Ahia, O. et al. (2023). "Do All Languages Cost the Same? Tokenization in the Era of Commercial Language Models." EMNLP 2023.' />
          <Citation id={4} text='Rust, P. et al. (2021). "How Good is Your Tokenizer? On the Monolingual Performance of Multilingual Language Models." ACL 2021.' />
          <Citation id={5} text='OpenAI. (2024). "tiktoken: Fast BPE tokeniser for use with OpenAI models." GitHub repository.' />
          <Citation id={6} text='Kudo, T. & Richardson, J. (2018). "SentencePiece: A simple and language independent subword tokenizer and detokenizer for Neural Text Processing." EMNLP 2018.' />
        </ol>
      </section>
    </div>
  );
}
