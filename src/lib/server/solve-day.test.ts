import { describe, expect, it } from "vitest";
import { SLOT_COUNT } from "$lib/domain/shift";
import type { DayData } from "$lib/domain/day";
import type { StoredEmployee } from "./db/employees";
import { attachDayAvailability, applySolution, buildSolveInput } from "./solve-day";

const alice: StoredEmployee = {
  id: "alice",
  name: "アリス",
  roles: ["hall"],
  minShiftLength: 8,
  maxShiftLength: 16,
};
const bob: StoredEmployee = {
  id: "bob",
  name: "ボブ",
  roles: ["hot"],
  minShiftLength: 8,
  maxShiftLength: 16,
};

describe("attachDayAvailability", () => {
  it("attaches the day's availability window to an employee who has one", () => {
    const result = attachDayAvailability([alice], { alice: { start: 0, end: 10 } });

    expect(result).toEqual([{ ...alice, availability: { start: 0, end: 10 } }]);
  });

  it("excludes an employee who has no availability entry for the day", () => {
    const result = attachDayAvailability([alice, bob], { alice: { start: 0, end: 10 } });

    expect(result).toEqual([{ ...alice, availability: { start: 0, end: 10 } }]);
  });

  it("returns an empty list when no employee has availability", () => {
    expect(attachDayAvailability([alice, bob], {})).toEqual([]);
  });
});

function emptyRequirements() {
  return Array.from({ length: SLOT_COUNT }, () => ({ hall: 0, hot: 0, cold: 0, dishwashing: 0 }));
}

describe("buildSolveInput", () => {
  it("combines employees (with day availability attached), requirements, and pinned assignments", () => {
    const day: DayData = {
      requirements: emptyRequirements(),
      availability: { alice: { start: 0, end: 10 } },
      pinnedAssignments: [],
      solution: null,
    };
    const pinnedAssignments = [{ employeeId: "alice", role: "hall" as const, start: 0, length: 8 }];

    const input = buildSolveInput({ employees: [alice, bob], day, pinnedAssignments });

    expect(input).toEqual({
      employees: [{ ...alice, availability: { start: 0, end: 10 } }],
      requirements: day.requirements,
      pinnedAssignments,
    });
  });
});

describe("applySolution", () => {
  it("replaces pinnedAssignments and solution while keeping requirements and availability", () => {
    const day: DayData = {
      requirements: emptyRequirements(),
      availability: { alice: { start: 0, end: 10 } },
      pinnedAssignments: [],
      solution: null,
    };
    const pinnedAssignments = [{ employeeId: "alice", role: "hall" as const, start: 0, length: 8 }];
    const solution = {
      status: "optimal",
      objectiveValue: 1,
      assignments: pinnedAssignments,
      shortages: [],
    };

    const result = applySolution(day, pinnedAssignments, solution);

    expect(result).toEqual({
      requirements: day.requirements,
      availability: day.availability,
      pinnedAssignments,
      solution,
    });
  });
});
