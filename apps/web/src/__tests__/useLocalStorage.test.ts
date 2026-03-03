/**
 * useLocalStorage Hook Tests — Phase 5
 *
 * Validates:
 * - Reads/writes to localStorage
 * - Schema versioning (version mismatch discards data)
 * - Legacy unversioned data migration
 * - remove() clears key and resets to initial
 * - Cross-tab sync via StorageEvent
 * - Graceful degradation when localStorage throws
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

beforeEach(() => {
  window.localStorage.clear();
});

describe("useLocalStorage — Basic Read/Write", () => {
  it("returns initial value when key is absent", () => {
    const { result } = renderHook(() =>
      useLocalStorage("test-key", "default"),
    );
    expect(result.current[0]).toBe("default");
  });

  it("persists value to localStorage as versioned wrapper", () => {
    const { result } = renderHook(() =>
      useLocalStorage("test-key", "initial"),
    );

    act(() => {
      result.current[1]("updated");
    });

    expect(result.current[0]).toBe("updated");

    const stored = JSON.parse(
      window.localStorage.getItem("test-key") ?? "null",
    ) as { version: number; data: string };
    expect(stored.version).toBe(1);
    expect(stored.data).toBe("updated");
  });

  it("reads existing versioned value from localStorage", () => {
    window.localStorage.setItem(
      "pre-set",
      JSON.stringify({ version: 1, data: "persisted" }),
    );

    const { result } = renderHook(() =>
      useLocalStorage("pre-set", "default"),
    );
    expect(result.current[0]).toBe("persisted");
  });

  it("supports functional updates", () => {
    const { result } = renderHook(() => useLocalStorage("counter", 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });
    expect(result.current[0]).toBe(1);

    act(() => {
      result.current[1]((prev) => prev + 10);
    });
    expect(result.current[0]).toBe(11);
  });

  it("works with complex object values", () => {
    const initial = { name: "Alice", scores: [1, 2, 3] };

    const { result } = renderHook(() =>
      useLocalStorage("obj-key", initial),
    );

    const updated = { name: "Bob", scores: [4, 5, 6] };
    act(() => {
      result.current[1](updated);
    });

    expect(result.current[0]).toEqual(updated);
  });
});

describe("useLocalStorage — Schema Versioning", () => {
  it("discards data when version mismatches", () => {
    // Store version 1 data
    window.localStorage.setItem(
      "versioned",
      JSON.stringify({ version: 1, data: "old-shape" }),
    );

    // Read with version 2 — should discard
    const { result } = renderHook(() =>
      useLocalStorage("versioned", "new-default", 2),
    );
    expect(result.current[0]).toBe("new-default");

    // Old key should be removed
    expect(window.localStorage.getItem("versioned")).toBeNull();
  });

  it("accepts data when version matches", () => {
    window.localStorage.setItem(
      "versioned",
      JSON.stringify({ version: 3, data: "good" }),
    );

    const { result } = renderHook(() =>
      useLocalStorage("versioned", "fallback", 3),
    );
    expect(result.current[0]).toBe("good");
  });

  it("writes with correct version", () => {
    const { result } = renderHook(() =>
      useLocalStorage("v5-key", "data", 5),
    );

    act(() => {
      result.current[1]("new-data");
    });

    const stored = JSON.parse(
      window.localStorage.getItem("v5-key") ?? "null",
    ) as { version: number; data: string };
    expect(stored.version).toBe(5);
    expect(stored.data).toBe("new-data");
  });
});

describe("useLocalStorage — Legacy Migration", () => {
  it("reads legacy unversioned data", () => {
    // Legacy data without version wrapper
    window.localStorage.setItem("legacy", JSON.stringify("old-value"));

    const { result } = renderHook(() =>
      useLocalStorage("legacy", "default"),
    );
    // Should read the legacy value (treats as migration)
    expect(result.current[0]).toBe("old-value");
  });
});

describe("useLocalStorage — remove()", () => {
  it("removes key from localStorage and resets to initial", () => {
    window.localStorage.setItem(
      "removable",
      JSON.stringify({ version: 1, data: "stored" }),
    );

    const { result } = renderHook(() =>
      useLocalStorage("removable", "initial"),
    );

    expect(result.current[0]).toBe("stored");

    act(() => {
      result.current[2](); // remove()
    });

    expect(result.current[0]).toBe("initial");
    expect(window.localStorage.getItem("removable")).toBeNull();
  });
});

describe("useLocalStorage — Cross-Tab Sync", () => {
  it("updates state when StorageEvent fires for same key", () => {
    const { result } = renderHook(() =>
      useLocalStorage("sync-key", "original"),
    );

    act(() => {
      // Simulate another tab writing
      const event = new StorageEvent("storage", {
        key: "sync-key",
        newValue: JSON.stringify({ version: 1, data: "from-other-tab" }),
      });
      window.dispatchEvent(event);
    });

    expect(result.current[0]).toBe("from-other-tab");
  });

  it("ignores StorageEvent for different key", () => {
    const { result } = renderHook(() =>
      useLocalStorage("my-key", "mine"),
    );

    act(() => {
      const event = new StorageEvent("storage", {
        key: "other-key",
        newValue: JSON.stringify({ version: 1, data: "not-mine" }),
      });
      window.dispatchEvent(event);
    });

    expect(result.current[0]).toBe("mine");
  });

  it("ignores StorageEvent with wrong version", () => {
    const { result } = renderHook(() =>
      useLocalStorage("versioned-sync", "default", 2),
    );

    act(() => {
      const event = new StorageEvent("storage", {
        key: "versioned-sync",
        newValue: JSON.stringify({ version: 1, data: "stale" }),
      });
      window.dispatchEvent(event);
    });

    // Should keep default — version 1 != version 2
    expect(result.current[0]).toBe("default");
  });
});

describe("useLocalStorage — Graceful Degradation", () => {
  it("returns initial value when localStorage.getItem throws", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    const { result } = renderHook(() =>
      useLocalStorage("broken", "fallback"),
    );
    expect(result.current[0]).toBe("fallback");
  });

  it("degrades silently when localStorage.setItem throws", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    const { result } = renderHook(() =>
      useLocalStorage("full-storage", "init"),
    );

    // Should not throw
    act(() => {
      result.current[1]("new-value");
    });

    // State still updates in memory
    expect(result.current[0]).toBe("new-value");
  });
});
