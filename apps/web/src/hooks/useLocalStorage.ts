/**
 * useLocalStorage Hook
 *
 * Typed persistence for UI preferences (language, last text, etc.).
 * Falls back gracefully if localStorage is unavailable (SSR, incognito).
 *
 * Why typed persistence:
 * - Prevents storing/reading mismatched types silently
 * - Autocompletion for stored values
 * - Default values eliminate null checks at call sites
 */

import { useState, useCallback, useEffect } from "react";

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize from localStorage or fallback
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      return initialValue;
    }
  });

  // Persist to localStorage on change
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue =
          value instanceof Function ? value(prev) : value;
        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch {
          // localStorage full or unavailable — degrade silently
        }
        return nextValue;
      });
    },
    [key],
  );

  // Sync across tabs
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key === key && e.newValue !== null) {
        try {
          setStoredValue(JSON.parse(e.newValue) as T);
        } catch {
          // ignore malformed data
        }
      }
    }
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key]);

  return [storedValue, setValue];
}
