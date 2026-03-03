/**
 * GlitchTokenWarning — Displays warnings for anomalous tokens / partial failures.
 *
 * Boundary rationale:
 * - Purely presentational: accepts a list of warning strings.
 * - Does NOT contain business logic — the API/service layer determines warnings.
 * - Amber/red visual indicator draws attention without being modal-blocking.
 * - Separated from ResultsPanel to keep warning UI independently swappable.
 */

import { AlertTriangle, X } from "lucide-react";
import { useState, useCallback } from "react";

interface GlitchTokenWarningProps {
  /** List of warning messages to display. */
  readonly warnings: readonly string[];
}

export default function GlitchTokenWarning({
  warnings,
}: GlitchTokenWarningProps) {
  const [dismissed, setDismissed] = useState<ReadonlySet<number>>(
    new Set(),
  );

  const dismiss = useCallback((index: number) => {
    setDismissed((prev) => new Set([...prev, index]));
  }, []);

  const visible = warnings.filter((_, i) => !dismissed.has(i));

  if (visible.length === 0) return null;

  return (
    <div className="space-y-2" role="alert" aria-label="Analysis warnings">
      {warnings.map((warning, index) => {
        if (dismissed.has(index)) return null;

        const isSevere =
          warning.toLowerCase().includes("failed") ||
          warning.toLowerCase().includes("error");

        return (
          <div
            key={index}
            className={`
              flex items-start gap-3 rounded-lg border px-4 py-3 text-sm
              ${
                isSevere
                  ? "bg-red-500/10 border-red-500/30 text-red-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-300"
              }
            `}
          >
            <AlertTriangle
              className={`h-4 w-4 flex-shrink-0 mt-0.5 ${
                isSevere ? "text-red-400" : "text-amber-400"
              }`}
            />
            <p className="flex-1 leading-relaxed">{warning}</p>
            <button
              type="button"
              onClick={() => dismiss(index)}
              className="flex-shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors"
              aria-label={`Dismiss warning: ${warning}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
