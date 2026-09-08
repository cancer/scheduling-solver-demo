import { describe, expect, it } from "vitest";
import { SLOT_COUNT } from "$lib/domain/shift";
import { ValidationError } from "./errors";
import { parseDayRequestBody, parseSolveRequestBody } from "./days";

function emptyRequirements() {
  return Array.from({ length: SLOT_COUNT }, () => ({ hall: 0, hot: 0, cold: 0, dishwashing: 0 }));
}

function validDay() {
  return {
    requirements: emptyRequirements(),
    availability: { alice: { start: 0, end: 10 } },
    pinnedAssignments: [{ employeeId: "alice", role: "hall", start: 0, length: 8 }],
    solution: {
      status: "optimal",
      objectiveValue: 0,
      assignments: [{ employeeId: "alice", role: "hall", start: 0, length: 8 }],
      shortages: [{ slot: 0, role: "hall", amount: 1 }],
    },
  };
}

describe("parseDayRequestBody", () => {
  it("parses a valid day with a solution", () => {
    const day = validDay();

    expect(parseDayRequestBody({ day })).toEqual(day);
  });

  it("parses a valid day whose solution is null", () => {
    const day = { ...validDay(), solution: null };

    expect(parseDayRequestBody({ day })).toEqual(day);
  });

  it("throws ValidationError when requirements has the wrong number of slots", () => {
    const day = { ...validDay(), requirements: emptyRequirements().slice(1) };

    expect(() => parseDayRequestBody({ day })).toThrow(ValidationError);
  });

  it("throws ValidationError when an assignment has an unknown role", () => {
    const day = {
      ...validDay(),
      pinnedAssignments: [{ employeeId: "alice", role: "unknown-role", start: 0, length: 8 }],
    };

    expect(() => parseDayRequestBody({ day })).toThrow(ValidationError);
  });

  it("throws ValidationError when availability window is malformed", () => {
    const day = { ...validDay(), availability: { alice: { start: "0", end: 10 } } };

    expect(() => parseDayRequestBody({ day })).toThrow(ValidationError);
  });

  it("throws ValidationError when day is missing", () => {
    expect(() => parseDayRequestBody({})).toThrow(ValidationError);
  });

  it("throws ValidationError when a shortage has an unknown role", () => {
    const day = {
      ...validDay(),
      solution: {
        ...validDay().solution,
        shortages: [{ slot: 0, role: "unknown-role", amount: 1 }],
      },
    };

    expect(() => parseDayRequestBody({ day })).toThrow(ValidationError);
  });
});

describe("parseSolveRequestBody", () => {
  it("parses a valid pinnedAssignments list", () => {
    const pinnedAssignments = [{ employeeId: "alice", role: "hall", start: 0, length: 8 }];

    expect(parseSolveRequestBody({ pinnedAssignments })).toEqual(pinnedAssignments);
  });

  it("parses an empty pinnedAssignments list", () => {
    expect(parseSolveRequestBody({ pinnedAssignments: [] })).toEqual([]);
  });

  it("throws ValidationError when pinnedAssignments is missing", () => {
    expect(() => parseSolveRequestBody({})).toThrow(ValidationError);
  });

  it("throws ValidationError when an assignment field has the wrong type", () => {
    const pinnedAssignments = [{ employeeId: "alice", role: "hall", start: "0", length: 8 }];

    expect(() => parseSolveRequestBody({ pinnedAssignments })).toThrow(ValidationError);
  });
});
