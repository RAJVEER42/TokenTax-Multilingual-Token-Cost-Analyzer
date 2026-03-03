/**
 * useDebounce Hook
 *
 * Returns a debounced version of the provided value.
 *
 * Why debouncing improves backend stability:
 * - Without debounce, every keystroke in a 50-char word triggers 50 API calls
 * - The backend rate-limits or overloads; the user gets errors or lag
 * - Debouncing waits until the user pauses typing, then fires ONE request
 * - Configurable delay (default 400ms) balances responsiveness vs load
 *
 * Why this is a separate hook:
 * - Reusable across any input that needs debouncing (search, filters, etc.)
 * - Testable in isolation — no coupling to analysis logic
 * - Follows SRP: this hook debounces; useTokenAnalysis orchestrates
 */

import { useState, useEffect } from "react";

/**
 * Debounce a value by the given delay.
 * Returns the debounced value that only updates after `delayMs`
 * milliseconds of inactivity.
 */
export function useDebounce<T>(value: T, delayMs: number = 400): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
