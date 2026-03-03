/**
 * GlitchTokensPage — Deep dive into glitch token detection.
 *
 * Expands Phase 7 detection with encoding explanations,
 * token ID breakdowns, safety implications, and version caveats.
 */

import { Link } from "react-router-dom";
import {
  Bug,
  Shield,
  AlertTriangle,
  Code2,
  BookOpen,
  Zap,
  Info,
} from "lucide-react";

function InfoCard({
  icon: Icon,
  title,
  children,
}: {
  readonly icon: typeof Bug;
  readonly title: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="glass rounded-xl p-6 space-y-3">
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

const EXAMPLE_GLITCHES: readonly {
  readonly tokenId: number;
  readonly text: string;
  readonly tokenizer: string;
  readonly danger: string;
  readonly dangerColor: string;
  readonly effect: string;
}[] = [
  {
    tokenId: 177,
    text: " \t",
    tokenizer: "tiktoken (cl100k_base)",
    danger: "LOW",
    dangerColor: "text-amber-400",
    effect: "Decodes to invisible whitespace; may cause inconsistent formatting in model outputs.",
  },
  {
    tokenId: 188,
    text: "\\xff",
    tokenizer: "tiktoken (cl100k_base)",
    danger: "MEDIUM",
    dangerColor: "text-orange-400",
    effect: "Invalid UTF-8 byte sequence; can cause decoding errors in downstream processing.",
  },
  {
    tokenId: 9999,
    text: "SolidGoldMagikarp",
    tokenizer: "GPT-2 (HuggingFace)",
    danger: "HIGH",
    dangerColor: "text-red-400",
    effect: "Token exists in vocabulary but was never (or rarely) encountered during training, causing erratic model behavior when triggered.",
  },
];

export default function GlitchTokensPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-red-500/15 flex items-center justify-center">
            <Bug className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Glitch Tokens Deep Dive</h1>
            <p className="text-slate-400 text-sm">
              Understanding tokenizer vocabulary artifacts and their implications.
            </p>
          </div>
        </div>
      </header>

      {/* Educational disclaimer */}
      <div className="glass rounded-xl p-4 border-amber-500/20">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-300">
            <strong className="text-amber-400">Educational context:</strong>{" "}
            Glitch token detection is for research and awareness purposes.
            Detection does not imply vulnerability. These are tokenizer
            artifacts, not security exploits.
          </p>
        </div>
      </div>

      {/* What Are Glitch Tokens */}
      <InfoCard icon={Bug} title="What Are Glitch Tokens?">
        <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
          <p>
            Glitch tokens are entries in a tokenizer&apos;s vocabulary that exhibit
            anomalous behavior. They emerge from the BPE training process: when a
            particular byte sequence appeared enough times in the training data to
            earn its own token ID, but rarely enough that the language model itself
            never learned to handle it properly.
          </p>
          <p>
            The most famous example is the &quot;SolidGoldMagikarp&quot; token (discovered
            in GPT-2&apos;s vocabulary) — a Reddit username that was tokenized as a single
            token but triggers erratic completions because the model has no meaningful
            representation for it.
          </p>
        </div>
      </InfoCard>

      {/* How BPE Creates Glitch Tokens */}
      <InfoCard icon={Code2} title="How BPE Creates Glitch Tokens">
        <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
          <p>
            Byte-Pair Encoding works by iteratively merging the most frequent
            adjacent byte pairs in a training corpus. This process is deterministic
            but creates a vocabulary that reflects the <em>training data distribution</em>,
            not the <em>useful token distribution</em>.
          </p>
          <div className="bg-slate-900/60 border border-white/6 rounded-lg p-4 font-mono text-xs space-y-1">
            <p className="text-slate-500">// Simplified BPE merge sequence:</p>
            <p className="text-indigo-300">Step 1: &quot;S&quot;, &quot;o&quot;, &quot;l&quot;, &quot;i&quot;, &quot;d&quot; → &quot;Sol&quot;, &quot;id&quot;</p>
            <p className="text-indigo-300">Step 2: &quot;Sol&quot;, &quot;id&quot;, &quot;Gold&quot; → &quot;SolidGold&quot;</p>
            <p className="text-indigo-300">Step 3: &quot;SolidGold&quot;, &quot;Magi&quot;, &quot;karp&quot; → &quot;SolidGoldMagikarp&quot;</p>
            <p className="text-slate-500">// Token ID assigned but model has no learned embedding → glitch</p>
          </div>
          <p>
            The tokenizer and the language model have separate training processes.
            A token can exist in the vocabulary without the model having learned a
            useful representation for it.
          </p>
        </div>
      </InfoCard>

      {/* Token ID Breakdown */}
      <InfoCard icon={AlertTriangle} title="Example Glitch Tokens">
        <div className="space-y-3">
          {EXAMPLE_GLITCHES.map((g) => (
            <div key={g.tokenId} className="bg-slate-900/60 border border-white/6 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs bg-white/5 px-2 py-1 rounded text-slate-300">
                    ID: {g.tokenId}
                  </span>
                  <span className="font-mono text-xs bg-white/5 px-2 py-1 rounded text-slate-300">
                    &quot;{g.text}&quot;
                  </span>
                </div>
                <span className={`text-xs font-medium ${g.dangerColor}`}>
                  {g.danger}
                </span>
              </div>
              <p className="text-xs text-slate-400">{g.tokenizer}</p>
              <p className="text-xs text-slate-300 mt-1">{g.effect}</p>
            </div>
          ))}
        </div>
      </InfoCard>

      {/* Danger Levels */}
      <InfoCard icon={Shield} title="Danger Level Classification">
        <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
          <div className="grid gap-3">
            <div className="bg-slate-900/60 border border-white/6 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <strong className="text-amber-400">LOW</strong>
              </div>
              <p className="text-xs text-slate-400">
                Cosmetic oddity. Token decodes to unusual whitespace, invisible
                characters, or formatting artifacts. No functional impact on model
                behavior.
              </p>
            </div>
            <div className="bg-slate-900/60 border border-white/6 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-orange-400" />
                <strong className="text-orange-400">MEDIUM</strong>
              </div>
              <p className="text-xs text-slate-400">
                May cause unexpected model behavior in edge cases — anomalous
                logprobs, prompt-injection surface, or inconsistent outputs when
                the token appears in unusual contexts.
              </p>
            </div>
            <div className="bg-slate-900/60 border border-white/6 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <strong className="text-red-400">HIGH</strong>
              </div>
              <p className="text-xs text-slate-400">
                Known to trigger reproducible model pathologies — evasion of content
                filters, garbled output, or tokens that cause the model to enter
                degenerate states (repetition loops, refusal to continue).
              </p>
            </div>
          </div>
        </div>
      </InfoCard>

      {/* Safety Implications */}
      <InfoCard icon={Shield} title="Safety & Ethics">
        <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
          <p>
            TokenTax presents glitch token data in an educational, non-alarmist
            manner. Key principles:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
            <li>Detection ≠ vulnerability. We report observations, not exploits.</li>
            <li>No instructions for malicious use. We describe effects, not attack vectors.</li>
            <li>Responsible disclosure. Known high-severity glitches are reported to tokenizer maintainers.</li>
            <li>Glitch registries are version-pinned. A token may be fixed in a newer tokenizer version.</li>
          </ul>
        </div>
      </InfoCard>

      {/* Version Caveats */}
      <InfoCard icon={BookOpen} title="Version Caveats">
        <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
          <p>
            Glitch token detection is tied to specific tokenizer library versions:
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-400 ml-4">
            <li>
              <strong className="text-white">tiktoken</strong> — Pinned to cl100k_base vocabulary.
              Token IDs may change with o200k_base or future vocabularies.
            </li>
            <li>
              <strong className="text-white">HuggingFace GPT-2</strong> — Uses the original GPT-2
              tokenizer (50,257 vocabulary). Not applicable to GPT-3.5+ models.
            </li>
            <li>
              <strong className="text-white">SentencePiece</strong> — Version-dependent. Different
              model files produce different vocabularies.
            </li>
          </ul>
          <p>
            Always check the <code className="text-indigo-300 text-xs bg-white/5 px-1.5 py-0.5 rounded">tokenizer_version</code>{" "}
            field in glitch detection results to verify applicability.
          </p>
        </div>
      </InfoCard>

      {/* CTA */}
      <div className="glass rounded-xl p-6 text-center">
        <p className="text-sm text-slate-400 mb-3">
          Try detecting glitch tokens in your own text.
        </p>
        <Link
          to="/analyze"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
        >
          <Zap className="w-4 h-4" />
          Analyze Text
        </Link>
      </div>
    </div>
  );
}
