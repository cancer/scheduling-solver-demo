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
const solution: StoredSolution = {
  status: "optimal",
  objectiveValue: 0,
  assignments: [],
  shortages: [],
};
const assignedSolution: StoredSolution = {
  ...solution,
  assignments: [{ employeeId: "e1", role: "hall", start: 0, length: 8 }],
};
const solvedSolution: StoredSolution = {
  ...assignedSolution,
  shortages: [{ slot: 0, role: "hall", amount: 2 }],
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
    solveDay: vi.fn(async () => ({ ...day, solution: solvedSolution })),
    reset: vi.fn(),
  };
}

describe("schedule page", () => {
  it("starts solving from an explicit button and reports completion without a second day save", async () => {
    const apiClient = fakeApiClient();
    render(Page, { data: { date: "2026-09-08", employees: [alice], day }, apiClient });

    const solveButton = screen.getByRole("button", { name: "この日のシフトを求解" });
    expect((solveButton as HTMLButtonElement).disabled).toBe(false);
    await fireEvent.click(solveButton);

    expect(apiClient.solveDay).toHaveBeenCalledWith("2026-09-08", []);
    await vi.waitFor(() => expect(screen.getByText("求解しました")).toBeTruthy());
    expect(apiClient.putDay).not.toHaveBeenCalled();
  });

  it("shows the returned assignment and shortage after solving", async () => {
    const apiClient = fakeApiClient();
    render(Page, { data: { date: "2026-09-08", employees: [alice], day }, apiClient });

    await fireEvent.click(screen.getByRole("button", { name: "この日のシフトを求解" }));

    await vi.waitFor(() => {
      expect(screen.getByRole("button", { name: /アリス.*ホール.*10:00.*14:00/ })).toBeTruthy();
      expect(screen.getByLabelText("ホール 10:00 不足2人")).toBeTruthy();
    });
  });

  it("pins a clicked bar and sends the updated fixed assignment to solve", async () => {
    const apiClient = fakeApiClient();
    render(Page, {
      data: { date: "2026-09-08", employees: [alice], day: { ...day, solution: assignedSolution } },
      apiClient,
    });

    await fireEvent.click(screen.getByRole("button", { name: /アリス.*ホール/ }));

    expect(apiClient.solveDay).toHaveBeenCalledWith("2026-09-08", [
      assignedSolution.assignments[0],
    ]);
  });

  it("reports a failed solve without saving through the day input endpoint", async () => {
    const apiClient = {
      ...fakeApiClient(),
      solveDay: vi.fn(async () => {
        throw new Error("solver failed");
      }),
    } as ApiClient;
    render(Page, { data: { date: "2026-09-08", employees: [alice], day }, apiClient });

    await fireEvent.click(screen.getByRole("button", { name: "この日のシフトを求解" }));

    await vi.waitFor(() => expect(screen.getByText("求解に失敗しました")).toBeTruthy());
    expect(apiClient.putDay).not.toHaveBeenCalled();
  });
});
