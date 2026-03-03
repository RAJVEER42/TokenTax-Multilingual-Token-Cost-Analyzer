/**
 * LanguageSelector — Chip-based language picker.
 *
 * Boundary rationale:
 * - Decouples language selection UI from analysis logic.
 * - Controlled component: parent owns the selected value.
 * - Reusable across pages (analyze, comparison, settings).
 * - Does NOT fetch languages itself — accepts them as props.
 */

import { useId } from "react";
import type { LanguageInfo } from "@/types";

interface LanguageSelectorProps {
  /** Available languages to choose from. */
  readonly languages: readonly LanguageInfo[];
  /** Currently selected language code. */
  readonly value: string;
  /** Called when a language is selected. */
  readonly onChange: (code: string) => void;
  /** Whether the selector is disabled. */
  readonly disabled?: boolean;
  /** Accessible label. */
  readonly label?: string;
  /** Use dropdown mode instead of chips. */
  readonly variant?: "chips" | "dropdown";
}

export default function LanguageSelector({
  languages,
  value,
  onChange,
  disabled = false,
  label = "Language",
  variant = "chips",
}: LanguageSelectorProps) {
  const id = useId();

  if (variant === "dropdown") {
    return (
      <div className="space-y-2">
        <label
          htmlFor={id}
          className="text-sm font-medium text-slate-300"
        >
          {label}
        </label>
        <select
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-label={label}
          className="
            w-full rounded-lg border border-slate-700 bg-slate-900/50
            px-3 py-2.5 text-sm text-slate-200 outline-none
            focus:border-brand-500 focus:ring-1 focus:ring-brand-500/40
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors
          "
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.name} ({lang.code})
            </option>
          ))}
        </select>
      </div>
    );
  }

  // ── Chip variant (default) ──────────────────────────

  return (
    <fieldset className="space-y-2" disabled={disabled}>
      <legend className="text-sm font-medium text-slate-300">
        {label}
      </legend>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label={label}
      >
        {languages.map((lang) => {
          const isSelected = lang.code === value;
          return (
            <button
              key={lang.code}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(lang.code)}
              disabled={disabled}
              className={`
                inline-flex items-center gap-1.5 rounded-full px-3 py-1.5
                text-xs font-medium transition-all border
                ${
                  isSelected
                    ? "bg-brand-500/20 text-brand-400 border-brand-500/40"
                    : "bg-slate-800/40 text-slate-400 border-slate-700/50 hover:text-slate-200 hover:border-slate-600"
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
            >
              <span className="uppercase tracking-wide">{lang.code}</span>
              <span className="hidden sm:inline text-slate-500">
                {lang.name}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
