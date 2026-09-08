import { describe, expect, it } from "vitest";

import { createUpperBoundFixture } from "./fixture";
import { buildLpModel } from "./lp";
import { readScheduleSolution } from "./solution";
import type { HighsSolution } from "./solver-loader";

describe("readScheduleSolution", () => {
  it("reads assignments and shortage values by variable name from an optimal result", () => {
    const model = buildLpModel(createUpperBoundFixture());
    const assignment = model.candidates[0];
    const shortage = model.shortageVariables[0];
    const result = {
      Status: "Optimal",
      ObjectiveValue: 42,
      Columns: {
        [assignment.variableName]: {
          Index: 0,
          Lower: 0,
          Upper: 1,
          Primal: 1,
          Type: "Integer",
          Name: assignment.variableName,
        },
        [shortage.name]: {
          Index: 1,
          Lower: 0,
          Upper: Infinity,
          Primal: 2,
          Type: "Continuous",
          Name: shortage.name,
        },
      },
      Rows: [],
    } as HighsSolution;

    const solution = readScheduleSolution(model, result);

    expect(solution.status).toBe("Optimal");
    expect(solution.objectiveValue).toBe(42);
    expect(solution.assignments).toEqual([
      {
        employeeId: assignment.employeeId,
        role: assignment.role,
        start: assignment.start,
        length: assignment.length,
        end: assignment.end,
      },
    ]);
    expect(solution.shortages[0]).toEqual({
      slot: shortage.slot,
      role: shortage.role,
      amount: 2,
    });
    expect(solution.shortages).toHaveLength(112);
  });

  it("preserves a non-optimal result status for the caller to report", () => {
    const model = buildLpModel(createUpperBoundFixture());
    const result = {
      Status: "Infeasible",
      ObjectiveValue: 0,
      Columns: {},
      Rows: [],
    } as HighsSolution;

    expect(readScheduleSolution(model, result)).toEqual({
      status: "Infeasible",
      objectiveValue: 0,
      assignments: [],
      shortages: model.shortageVariables.map((shortage) => ({
        slot: shortage.slot,
        role: shortage.role,
        amount: 0,
      })),
    });
  });
});
