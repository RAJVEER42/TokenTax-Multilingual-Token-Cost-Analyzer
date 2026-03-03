/**
 * TextInput — Controlled textarea with character counter.
 *
 * Boundary rationale:
 * - Isolates input concerns (validation, counting, ARIA) from analysis logic.
 * - Does NOT manage global state — accepts value/onChange from parent.
 * - Reusable anywhere text entry is needed (analyze page, comparison page).
 */

import { useId, useMemo } from "react";

const MAX_LENGTH = 50_000;

interface TextInputProps {
  /** Current text value (controlled). */
  readonly value: string;
  /** Called when the user types. */
  readonly onChange: (value: string) => void;
  /** Optional placeholder text. */
  readonly placeholder?: string;
  /** Optional maximum character limit. Defaults to 50,000. */
  readonly maxLength?: number;
  /** Whether the input is disabled. */
  readonly disabled?: boolean;
  /** Accessible label for the textarea. */
  readonly label?: string;
}

export default function TextInput({
  value,
  onChange,
  placeholder = "Enter or paste text to analyze…",
  maxLength = MAX_LENGTH,
  disabled = false,
  label = "Analysis text input",
}: TextInputProps) {
  const id = useId();
  const charCount = value.length;
  const isOverLimit = charCount > maxLength;

  const counterColor = useMemo(() => {
    if (isOverLimit) return "text-red-400";
    if (charCount > maxLength * 0.9) return "text-amber-400";
    return "text-slate-500";
  }, [charCount, maxLength, isOverLimit]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="text-sm font-medium text-slate-300"
        >
          {label}
        </label>
        <span
          className={`text-xs font-mono tabular-nums ${counterColor}`}
          aria-live="polite"
          aria-label={`${charCount} of ${maxLength.toLocaleString()} characters used`}
        >
          {charCount.toLocaleString()}/{maxLength.toLocaleString()}
        </span>
      </div>

      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength + 100} /* slight buffer so user sees the limit */
        rows={6}
        aria-invalid={isOverLimit}
        aria-describedby={isOverLimit ? `${id}-error` : undefined}
        className={`
          w-full resize-y rounded-lg border p-4 text-sm leading-relaxed
          bg-slate-900/50 text-slate-200 placeholder:text-slate-500
          outline-none transition-colors
          ${
            isOverLimit
              ? "border-red-500/60 focus:border-red-500 focus:ring-1 focus:ring-red-500/40"
              : "border-slate-700 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40"
          }
          disabled:opacity-50 disabled:cursor-not-allowed
        `}
      />

      {isOverLimit && (
        <p
          id={`${id}-error`}
          role="alert"
          className="text-xs text-red-400"
        >
          Text exceeds maximum length of {maxLength.toLocaleString()} characters.
        </p>
      )}
    </div>
  );
}
