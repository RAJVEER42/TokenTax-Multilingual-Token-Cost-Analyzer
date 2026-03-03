/**
 * Vitest test setup — runs before every test file.
 *
 * Provides:
 * - @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
 * - localStorage mock for jsdom
 * - fetch mock reset between tests
 * - AbortController polyfill check
 */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Auto-cleanup DOM after each test
afterEach(() => {
  cleanup();
});

// Reset mocks between tests
afterEach(() => {
  vi.restoreAllMocks();
});

// Ensure localStorage is available in jsdom
if (typeof window !== "undefined" && !window.localStorage) {
  const store: Record<string, string> = {};
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        Object.keys(store).forEach((key) => delete store[key]);
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (index: number) => Object.keys(store)[index] ?? null,
    },
    writable: true,
  });
}
