import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import LayoutHarness from "$lib/layout-test-harness.svelte";
import type { ApiClient } from "$lib/api/client";
import { getInvalidateAllCallCount, resetNavigationTestState } from "$lib/test-app-navigation";

function fakeApiClient(): ApiClient {
  return {
    getEmployees: vi.fn(),
    putEmployees: vi.fn(),
    getDay: vi.fn(),
    putDay: vi.fn(),
    solveDay: vi.fn(),
    reset: vi.fn(async () => undefined),
  };
}

describe("root layout", () => {
  beforeEach(resetNavigationTestState);
  afterEach(resetNavigationTestState);

  it("cancels pending saves before resetting and reloads the initial data", async () => {
    const events: string[] = [];
    const apiClient = {
      ...fakeApiClient(),
      reset: vi.fn(async () => {
        events.push("reset");
      }),
    };
    const cancel = vi.fn(() => {
      events.push("cancel");
    });
    render(LayoutHarness, { apiClient, cancel });

    expect(screen.getByRole("button", { name: "初期データに戻す" })).toBeTruthy();
    await fireEvent.click(screen.getByRole("button", { name: "初期データに戻す" }));

    expect(cancel).toHaveBeenCalledTimes(1);
    expect(events).toEqual(["cancel", "reset"]);
    expect(apiClient.reset).toHaveBeenCalledTimes(1);
    expect(getInvalidateAllCallCount()).toBe(1);
  });
});
