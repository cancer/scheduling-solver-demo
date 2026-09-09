import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDebouncer } from "./debounce";

describe("createDebouncer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not call the function before the delay has elapsed", () => {
    const fn = vi.fn();
    const debouncer = createDebouncer(300, fn);

    debouncer.trigger();
    vi.advanceTimersByTime(299);

    expect(fn).not.toHaveBeenCalled();
  });

  it("calls the function once the delay has elapsed", () => {
    const fn = vi.fn();
    const debouncer = createDebouncer(300, fn);

    debouncer.trigger();
    vi.advanceTimersByTime(300);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("collapses repeated triggers within the delay into a single call", () => {
    const fn = vi.fn();
    const debouncer = createDebouncer(300, fn);

    debouncer.trigger();
    vi.advanceTimersByTime(150);
    debouncer.trigger();
    vi.advanceTimersByTime(150);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(150);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not call the function after cancel", () => {
    const fn = vi.fn();
    const debouncer = createDebouncer(300, fn);

    debouncer.trigger();
    debouncer.cancel();
    vi.advanceTimersByTime(300);

    expect(fn).not.toHaveBeenCalled();
  });
});
