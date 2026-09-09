import { describe, expect, it, vi } from "vitest";
import type { ApiClient } from "./client";
import { loadDay, loadDayWithEmployees, loadEmployees } from "./loaders";
import type { StoredEmployee } from "./types";
import type { DayData } from "../domain/day";
import { emptyRequirements } from "../domain/shift";

const employee: StoredEmployee = {
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

function fakeClient(overrides: Partial<ApiClient> = {}): ApiClient {
  return {
    getEmployees: vi.fn(async () => [employee]),
    putEmployees: vi.fn(async (employees) => employees),
    getDay: vi.fn(async () => day),
    putDay: vi.fn(async (_date, nextDay) => nextDay),
    solveDay: vi.fn(async (_date, pinnedAssignments) => ({ ...day, pinnedAssignments })),
    reset: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("API loaders", () => {
  it("loads the shared employee master", async () => {
    const apiClient = fakeClient();

    await expect(loadEmployees(apiClient)).resolves.toEqual({ employees: [employee] });
  });

  it("loads one date-owned day", async () => {
    const apiClient = fakeClient();

    await expect(loadDay(apiClient, "2026-09-08")).resolves.toEqual({ date: "2026-09-08", day });
    expect(apiClient.getDay).toHaveBeenCalledWith("2026-09-08");
  });

  it("loads the shared employees and date-owned day for combined screens", async () => {
    const apiClient = fakeClient();

    await expect(loadDayWithEmployees(apiClient, "2026-09-08")).resolves.toEqual({
      date: "2026-09-08",
      employees: [employee],
      day,
    });
    expect(apiClient.getEmployees).toHaveBeenCalledTimes(1);
    expect(apiClient.getDay).toHaveBeenCalledWith("2026-09-08");
  });
});
