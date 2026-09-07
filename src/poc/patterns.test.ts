import { describe, expect, it } from "vitest";

import { generateShiftCandidates } from "./patterns";
import { ROLES, SLOT_COUNT } from "./types";
import type { Employee } from "./types";

const fullEmployee: Employee = {
  id: "employee-01",
  name: "従業員01",
  roles: ROLES,
  availability: { start: 0, end: SLOT_COUNT },
  minShiftLength: 8,
  maxShiftLength: 16,
};

describe("generateShiftCandidates", () => {
  it("generates 153 patterns for one role at the upper-bound fixture size", () => {
    const candidates = generateShiftCandidates({
      ...fullEmployee,
      roles: ["hall"],
    });

    expect(candidates).toHaveLength(153);
    expect(candidates.every((candidate) => candidate.role === "hall")).toBe(true);
  });

  it("keeps every candidate inside business hours and the employee availability", () => {
    const employee: Employee = {
      ...fullEmployee,
      roles: ["hall"],
      availability: { start: 4, end: 22 },
    };

    const candidates = generateShiftCandidates(employee);

    expect(
      candidates.every(
        (candidate) =>
          candidate.start >= 0 &&
          candidate.end <= SLOT_COUNT &&
          candidate.start >= employee.availability!.start &&
          candidate.end <= employee.availability!.end &&
          candidate.length >= employee.minShiftLength &&
          candidate.length <= employee.maxShiftLength,
      ),
    ).toBe(true);
  });

  it("creates candidates only for roles the employee can perform", () => {
    const candidates = generateShiftCandidates({
      ...fullEmployee,
      roles: ["cold", "dishwashing"],
    });

    expect(new Set(candidates.map((candidate) => candidate.role))).toEqual(
      new Set(["cold", "dishwashing"]),
    );
  });

  it("returns no candidates when availability is not entered", () => {
    const { availability: _availability, ...employeeWithoutAvailability } = fullEmployee;

    expect(generateShiftCandidates(employeeWithoutAvailability)).toEqual([]);
  });

  it("keeps candidate order and variable names deterministic", () => {
    const first = generateShiftCandidates(fullEmployee);
    const second = generateShiftCandidates({ ...fullEmployee });

    expect(second).toEqual(first);
    expect(new Set(first.map((candidate) => candidate.variableName)).size).toBe(first.length);
  });

  it("uses a stable fallback token for an empty employee id", () => {
    const candidates = generateShiftCandidates({ ...fullEmployee, id: "" });

    expect(candidates[0].variableName).toContain("x_employee_");
  });
});
