import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RootLayout from "./+layout.svelte";
import AvailabilityPage from "./days/[date]/availability/+page.svelte";
import type { ApiClient } from "$lib/api/client";
import type { StoredEmployee } from "$lib/api/types";
import type { DayData } from "$lib/domain/day";
import { emptyRequirements } from "$lib/domain/shift";
import { getInvalidateAllCallCount, resetNavigationTestState } from "$lib/test-app-navigation";

const alice: StoredEmployee = {
  id: "e1",
  name: "アリス",
  roles: ["hall"],
  minShiftLength: 8,
  maxShiftLength: 16,
};
const day: DayData = {
  requirements: emptyRequirements(),
  availability: {},
  pinnedAssignments: [],
  solution: null,
};

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
  afterEach(() => {
    resetNavigationTestState();
    vi.useRealTimers();
  });

  it("cancels a real daily page's pending save before resetting and reloads initial data", async () => {
    vi.useFakeTimers();
    const apiClient = fakeApiClient();
    render(
      AvailabilityPage,
      { data: { date: "2026-09-08", employees: [alice], day }, apiClient },
      { wrapper: RootLayout, wrapperProps: { apiClient } },
    );

    expect(screen.getByRole("button", { name: "初期データに戻す" })).toBeTruthy();
    await fireEvent.click(screen.getByRole("checkbox", { name: "アリス 出勤" }));
    expect(apiClient.putDay).not.toHaveBeenCalled();
    await fireEvent.click(screen.getByRole("button", { name: "初期データに戻す" }));

    expect(apiClient.reset).toHaveBeenCalledTimes(1);
    expect(getInvalidateAllCallCount()).toBe(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(apiClient.putDay).not.toHaveBeenCalled();
  });

  it("shows a reset failure without requesting a reload", async () => {
    const apiClient = {
      ...fakeApiClient(),
      reset: vi.fn(async () => {
        throw new Error("reset failed");
      }),
    };
    render(RootLayout, { apiClient });

    await fireEvent.click(screen.getByRole("button", { name: "初期データに戻す" }));

    expect(screen.getByText("初期データへの復元に失敗しました")).toBeTruthy();
    expect(apiClient.reset).toHaveBeenCalledTimes(1);
    expect(getInvalidateAllCallCount()).toBe(0);
  });
});
