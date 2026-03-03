/**
 * GlitchTokenWarning — Phase 7: Enhanced with structured glitch token display.
 *
 * Displays both plain-text warnings AND structured glitch token detections.
 *
 * Design decisions:
 * - Danger-level color coding (LOW → blue, MEDIUM → amber, HIGH → red)
 *   uses design-token CSS variables for theme consistency.
 * - Expandable explanations (details/summary) avoid visual clutter.
 * - External doc links open in new tabs for educational deep-dives.
 * - Full ARIA: role="alert", aria-expanded, aria-label on interactive elements.
 * - Non-blocking, non-modal — warnings are dismissible, not alarming.
 * - Educational framing: detection ≠ vulnerability.
 * - Responsive: single-column on mobile, full-width on desktop.
 */

import { AlertTriangle, ChevronDown, ExternalLink, Info, Shield, X } from "lucide-react";
import { useState, useCallback } from "react";
import type { GlitchToken, DangerLevel } from "@/types";

// ── Design-token color map ─────────────────────────────

const DANGER_STYLES: Record<DangerLevel, {
  bg: string;
  border: string;
  text: string;
  icon: string;
  badge: string;
  badgeText: string;
}> = {
  LOW: {
    bg: "bg-sky-500/10",
    border: "border-sky-500/30",
    text: "text-sky-300",
    icon: "text-sky-400",
    badge: "bg-sky-500/20",
    badgeText: "text-sky-300",
  },
  MEDIUM: {
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    text: "text-amber-300",
    icon: "text-amber-400",
    badge: "bg-amber-500/20",
    badgeText: "text-amber-300",
  },
  HIGH: {
    bg: "bg-red-500/10",
    border: "border-red-500/30",
    text: "text-red-300",
    icon: "text-red-400",
    badge: "bg-red-500/20",
    badgeText: "text-red-300",
  },
};

const DANGER_LABEL: Record<DangerLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
};

// ── Props ──────────────────────────────────────────────

interface GlitchTokenWarningProps {
  /** Plain-text warnings (e.g. estimated confidence, partial failures). */
  readonly warnings: readonly string[];
  /** Structured glitch token detections from the API. */
  readonly glitches?: readonly GlitchToken[];
}

// ── Sub-components ─────────────────────────────────────

function PlainWarning({
  warning,
  onDismiss,
}: {
  readonly warning: string;
  readonly onDismiss: () => void;
}) {
  const isSevere =
    warning.toLowerCase().includes("failed") ||
    warning.toLowerCase().includes("error");

  return (
    <div
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
        className={`h-4 w-4 shrink-0 mt-0.5 ${
          isSevere ? "text-red-400" : "text-amber-400"
        }`}
        aria-hidden="true"
      />
      <p className="flex-1 leading-relaxed">{warning}</p>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 p-0.5 rounded hover:bg-white/10 transition-colors"
        aria-label={`Dismiss warning: ${warning}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function GlitchCard({
  glitch,
  onDismiss,
}: {
  readonly glitch: GlitchToken;
  readonly onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const style = DANGER_STYLES[glitch.danger_level];
  const label = DANGER_LABEL[glitch.danger_level];

  const toggle = useCallback(() => {
    setExpanded((prev) => !prev);
  }, []);

  const occurrenceText =
    glitch.positions.length === 1
      ? "1 occurrence"
      : `${glitch.positions.length} occurrences`;

  return (
    <div
      className={`rounded-lg border ${style.bg} ${style.border} ${style.text} text-sm`}
    >
      {/* Header row */}
      <div className="flex items-start gap-3 px-4 py-3">
        <Shield
          className={`h-4 w-4 shrink-0 mt-0.5 ${style.icon}`}
          aria-hidden="true"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs font-mono">
              {glitch.token_text}
            </code>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge} ${style.badgeText}`}
            >
              {label}
            </span>
            <span className="text-xs opacity-70">
              {glitch.tokenizer_name} · {occurrenceText}
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed opacity-80">
            Glitch token detected — this is an educational observation, not a vulnerability.
          </p>
        </div>

        {/* Expand / Dismiss */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={toggle}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse details" : "Expand details"}
          >
            <ChevronDown
              className={`h-3.5 w-3.5 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="p-1 rounded hover:bg-white/10 transition-colors"
            aria-label={`Dismiss glitch warning for ${glitch.token_text}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable details */}
      {expanded && (
        <div className="border-t border-white/10 px-4 py-3 space-y-2">
          <div className="flex items-start gap-2">
            <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 opacity-60" aria-hidden="true" />
            <p className="text-xs leading-relaxed">{glitch.effect}</p>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs opacity-70">
            <dt className="font-medium">Token ID</dt>
            <dd className="font-mono">{glitch.token_id}</dd>
            <dt className="font-medium">Tokenizer</dt>
            <dd>{glitch.tokenizer_name} v{glitch.tokenizer_version}</dd>
            <dt className="font-medium">Positions</dt>
            <dd className="font-mono">
              {glitch.positions.length <= 10
                ? glitch.positions.join(", ")
                : `${glitch.positions.slice(0, 10).join(", ")}… (+${glitch.positions.length - 10})`}
            </dd>
          </dl>

          {glitch.reference !== "" && (
            <a
              href={glitch.reference}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs underline underline-offset-2 opacity-80 hover:opacity-100 transition-opacity"
            >
              <ExternalLink className="h-3 w-3" aria-hidden="true" />
              Learn more
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────

export default function GlitchTokenWarning({
  warnings,
  glitches = [],
}: GlitchTokenWarningProps) {
  const [dismissedWarnings, setDismissedWarnings] = useState<ReadonlySet<number>>(
    new Set(),
  );
  const [dismissedGlitches, setDismissedGlitches] = useState<ReadonlySet<number>>(
    new Set(),
  );

  const dismissWarning = useCallback((index: number) => {
    setDismissedWarnings((prev) => new Set([...prev, index]));
  }, []);

  const dismissGlitch = useCallback((index: number) => {
    setDismissedGlitches((prev) => new Set([...prev, index]));
  }, []);

  const visibleWarnings = warnings.filter((_, i) => !dismissedWarnings.has(i));
  const visibleGlitches = glitches.filter((_, i) => !dismissedGlitches.has(i));

  if (visibleWarnings.length === 0 && visibleGlitches.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2" role="alert" aria-label="Analysis warnings and glitch token detections">
      {/* Plain-text warnings */}
      {warnings.map((warning, index) => {
        if (dismissedWarnings.has(index)) return null;
        return (
          <PlainWarning
            key={`warn-${index}`}
            warning={warning}
            onDismiss={() => dismissWarning(index)}
          />
        );
      })}

      {/* Structured glitch token cards */}
      {glitches.map((glitch, index) => {
        if (dismissedGlitches.has(index)) return null;
        return (
          <GlitchCard
            key={`glitch-${glitch.tokenizer_name}-${glitch.token_id}-${index}`}
            glitch={glitch}
            onDismiss={() => dismissGlitch(index)}
          />
        );
      })}
    </div>
  );
}
