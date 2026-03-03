/**
 * useLocalStorage Hook — Phase 5: Schema-Versioned
 *
 * Typed persistence for UI preferences (language, last text, etc.).
 * Falls back gracefully if localStorage is unavailable (SSR, incognito).
 *
 * Why typed persistence:
 * - Prevents storing/reading mismatched types silently
 * - Autocompletion for stored values
 * - Default values eliminate null checks at call sites
 *
 * Why schema versioning:
 * - If the persisted shape changes between releases, old data in localStorage
 *   has the wrong shape → runtime crash when code reads missing/renamed fields
 * - Version check discards stale data cleanly instead of corrupting state
 * - Users get fresh defaults; no broken UI from stale localStorage artifacts
 *
 * Why restoration improves UX continuity:
 * - Users can reload the page and see their last inputs preserved
 * - Reduces friction — no re-typing after accidental refresh
 * - Cross-tab sync keeps multiple browser tabs consistent
 */

import { useState, useCallback, useEffect } from "react";

/** Wrapper shape stored in localStorage — includes version for migration. */
interface VersionedStorage<T> {
  readonly version: number;
  readonly data: T;
}

const DEFAULT_VERSION = 1;

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  version: number = DEFAULT_VERSION,
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Initialize from localStorage or fallback
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;

      const parsed: unknown = JSON.parse(raw);

      // Check if it's a versioned wrapper
      if (
        parsed != null &&
        typeof parsed === "object" &&
        "version" in parsed &&
        "data" in parsed
      ) {
        const wrapper = parsed as VersionedStorage<T>;
        if (wrapper.version === version) {
          return wrapper.data;
        }
        // Version mismatch — discard stale data
        window.localStorage.removeItem(key);
        return initialValue;
      }

      // Legacy unversioned data — migrate by wrapping
      return parsed as T;
    } catch {
      return initialValue;
    }
  });

  // Persist to localStorage on change (versioned)
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue = value instanceof Function ? value(prev) : value;
        try {
          const wrapper: VersionedStorage<T> = {
            version,
            data: nextValue,
          };
          window.localStorage.setItem(key, JSON.stringify(wrapper));
        } catch {
          // localStorage full or unavailable — degrade silently
        }
        return nextValue;
      });
    },
    [key, version],
  );

  /** Remove the key from localStorage entirely. */
  const remove = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // degrade silently
    }
    setStoredValue(initialValue);
  }, [key, initialValue]);

  // Sync across tabs
  useEffect(() => {
    function handleStorageChange(e: StorageEvent) {
      if (e.key === key && e.newValue !== null) {
        try {
          const parsed: unknown = JSON.parse(e.newValue);
          if (
            parsed != null &&
            typeof parsed === "object" &&
            "version" in parsed &&
            "data" in parsed
          ) {
            const wrapper = parsed as VersionedStorage<T>;
            if (wrapper.version === version) {
              setStoredValue(wrapper.data);
            }
          }
        } catch {
          // ignore malformed data from other tabs
        }
      }
    }
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [key, version]);

  return [storedValue, setValue, remove];
}
