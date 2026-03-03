/**
 * useDebounce Hook Tests — Phase 5
 *
 * Validates:
 * - Returns initial value immediately
 * - Debounces rapid changes (only last value emits)
 * - Custom delay is respected
 * - Cleanup cancels pending timeouts
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "@/hooks/useDebounce";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDebounce", () => {
  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 400));
    expect(result.current).toBe("hello");
  });

  it("does not update before delay expires", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 400),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });

    // Only 200ms — should still be "a"
    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current).toBe("a");
  });

  it("updates after delay expires", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 400),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(result.current).toBe("b");
  });

  it("debounces rapid changes — only last value emits", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: "a" } },
    );

    rerender({ value: "b" });
    act(() => vi.advanceTimersByTime(100));

    rerender({ value: "c" });
    act(() => vi.advanceTimersByTime(100));

    rerender({ value: "d" });
    act(() => vi.advanceTimersByTime(100));

    // Only 300ms total — "d" timer not expired yet
    expect(result.current).toBe("a");

    // Advance past "d" delay
    act(() => vi.advanceTimersByTime(300));
    expect(result.current).toBe("d");
  });

  it("respects custom delay", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 1000),
      { initialProps: { value: "slow" } },
    );

    rerender({ value: "fast" });

    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe("slow");

    act(() => vi.advanceTimersByTime(500));
    expect(result.current).toBe("fast");
  });

  it("uses default delay of 400ms", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 1 } },
    );

    rerender({ value: 2 });

    act(() => vi.advanceTimersByTime(399));
    expect(result.current).toBe(1);

    act(() => vi.advanceTimersByTime(1));
    expect(result.current).toBe(2);
  });

  it("works with object values", () => {
    const obj1 = { a: 1 };
    const obj2 = { a: 2 };

    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 400),
      { initialProps: { value: obj1 } },
    );

    rerender({ value: obj2 });

    act(() => vi.advanceTimersByTime(400));
    expect(result.current).toBe(obj2);
  });

  it("cancels pending timeout on unmount", () => {
    const clearSpy = vi.spyOn(globalThis, "clearTimeout");

    const { rerender, unmount } = renderHook(
      ({ value }) => useDebounce(value, 400),
      { initialProps: { value: "x" } },
    );

    rerender({ value: "y" });
    unmount();

    // clearTimeout should have been called during cleanup
    expect(clearSpy).toHaveBeenCalled();
    clearSpy.mockRestore();
  });
});
