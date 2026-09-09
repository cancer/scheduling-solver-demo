import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import Page from "./+page.svelte";
import type { ApiClient } from "$lib/api/client";
import type { StoredEmployee } from "$lib/api/types";
import type { DayData } from "$lib/domain/day";
import { emptyRequirements } from "$lib/domain/shift";
import { resetNavigationTestState, triggerBeforeNavigate } from "$lib/test-app-navigation";

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
    putDay: vi.fn(async (_date, nextDay) => nextDay),
    solveDay: vi.fn(),
    reset: vi.fn(),
  };
}

describe("availability page", () => {
  beforeEach(resetNavigationTestState);
  afterEach(() => {
    resetNavigationTestState();
    vi.useRealTimers();
  });

  it("explains one interval and that an omitted interval means off", async () => {
    vi.useFakeTimers();
    const apiClient = fakeApiClient();
    render(Page, { data: { date: "2026-09-08", employees: [alice], day }, apiClient });

    expect(screen.getByRole("heading", { name: "出勤可能時間帯" })).toBeTruthy();
    expect(screen.getByText(/未入力はその日の休み/)).toBeTruthy();
    await fireEvent.click(screen.getByRole("checkbox", { name: "アリス 出勤" }));
    await vi.advanceTimersByTimeAsync(500);

    expect(apiClient.putDay).toHaveBeenCalledWith("2026-09-08", {
      ...day,
      availability: { e1: { start: 0, end: 28 } },
    });
    expect(apiClient.putDay).toHaveBeenCalledTimes(1);
  });

  it("flushes a pending save when navigation starts", async () => {
    vi.useFakeTimers();
    const apiClient = fakeApiClient();
    render(Page, { data: { date: "2026-09-08", employees: [alice], day }, apiClient });

    await fireEvent.click(screen.getByRole("checkbox", { name: "アリス 出勤" }));
    triggerBeforeNavigate();
    await Promise.resolve();

    expect(apiClient.putDay).toHaveBeenCalledWith("2026-09-08", {
      ...day,
      availability: { e1: { start: 0, end: 28 } },
    });
    expect(apiClient.putDay).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(500);
    expect(apiClient.putDay).toHaveBeenCalledTimes(1);
  });
});
