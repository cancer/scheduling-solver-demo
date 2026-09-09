import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import Page from "./+page.svelte";
import type { ApiClient } from "$lib/api/client";
import type { StoredEmployee } from "$lib/api/types";
import type { DayData, StoredSolution } from "$lib/domain/day";
import { emptyRequirements } from "$lib/domain/shift";

const alice: StoredEmployee = {
  id: "e1",
  name: "アリス",
  roles: ["hall"],
  minShiftLength: 8,
  maxShiftLength: 16,
};

function emptyDay(): DayData {
  return {
    requirements: emptyRequirements(),
    availability: {},
    pinnedAssignments: [],
    solution: null,
  };
}

function fakeApiClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    getEmployees: vi.fn(async () => [alice]),
    putEmployees: vi.fn(async (employees) => employees),
    getDay: vi.fn(async () => emptyDay()),
    putDay: vi.fn(async (_date, day) => day),
    solveDay: vi.fn(async (_date, pinnedAssignments) => ({ ...emptyDay(), pinnedAssignments })),
    reset: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("+page.svelte", () => {
  it("loads employees and the selected day on mount", async () => {
    const apiClient = fakeApiClient();
    render(Page, { apiClient, initialDate: "2026-09-08" });

    await vi.waitFor(() => expect(apiClient.getEmployees).toHaveBeenCalled());
    expect(apiClient.getDay).toHaveBeenCalledWith("2026-09-08");
    await vi.waitFor(() => expect(screen.getByLabelText("アリスの名前")).toBeTruthy());
  });

  it("saves employees immediately (no debounce) when the employee list changes", async () => {
    const apiClient = fakeApiClient();
    render(Page, { apiClient, initialDate: "2026-09-08" });
    await vi.waitFor(() => expect(screen.getByLabelText("アリスの名前")).toBeTruthy());

    await fireEvent.click(screen.getByRole("button", { name: "アリスを削除" }));

    expect(apiClient.putEmployees).toHaveBeenCalledWith([]);
  });

  it("debounces the day autosave when the availability input changes", async () => {
    const apiClient = fakeApiClient();
    render(Page, { apiClient, initialDate: "2026-09-08" });
    await vi.waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "アリス 出勤" })).toBeTruthy(),
    );

    vi.useFakeTimers();
    try {
      await fireEvent.click(screen.getByRole("checkbox", { name: "アリス 出勤" }));
      expect(apiClient.putDay).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(1000);

      expect(apiClient.putDay).toHaveBeenCalledTimes(1);
      expect(apiClient.putDay).toHaveBeenCalledWith(
        "2026-09-08",
        expect.objectContaining({ availability: { e1: { start: 0, end: 28 } } }),
      );
    } finally {
      vi.useRealTimers();
    }
  });

  it("re-solves immediately when a shift bar is clicked to toggle its pin", async () => {
    const solution: StoredSolution = {
      status: "optimal",
      objectiveValue: 0,
      assignments: [{ employeeId: "e1", role: "hall", start: 0, length: 8 }],
      shortages: [],
    };
    const apiClient = fakeApiClient({
      getDay: vi.fn(async () => ({ ...emptyDay(), solution })),
    });
    render(Page, { apiClient, initialDate: "2026-09-08" });

    const bar = await screen.findByRole("button", { name: /アリス.*ホール.*10:00.*14:00/ });
    await fireEvent.click(bar);

    expect(apiClient.solveDay).toHaveBeenCalledWith("2026-09-08", [solution.assignments[0]]);
  });

  it("resets to the seed data and reloads when the reset button is clicked", async () => {
    const apiClient = fakeApiClient();
    render(Page, { apiClient, initialDate: "2026-09-08" });
    await vi.waitFor(() => expect(screen.getByLabelText("アリスの名前")).toBeTruthy());

    await fireEvent.click(screen.getByRole("button", { name: "初期データに戻す" }));

    expect(apiClient.reset).toHaveBeenCalled();
    await vi.waitFor(() => expect(apiClient.getEmployees).toHaveBeenCalledTimes(2));
  });
});
