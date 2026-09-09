import { describe, expect, it } from "vitest";

import { MAX_SHIFT_LENGTH, MIN_SHIFT_LENGTH, ROLES, SLOT_COUNT } from "../domain/shift";
import type { SlotRequirements } from "../domain/shift";

import { buildLpModel } from "./model";
import type { SolveInput } from "./model";
import { readScheduleSolution } from "./solution";
import type { HighsSolution } from "./solver-loader";

// `model.test.ts` の `createUpperBoundInput` と同じ形。ソルバー出力の解釈だけを見るテスト
// なので、変数数の大きさそのものに意味はなく「役割×コマ数ぶんの不足変数がある」ことだけ使う。
function createUpperBoundInput(): SolveInput {
  const employees = Array.from({ length: 10 }, (_, index) => ({
    id: `employee-${String(index + 1).padStart(2, "0")}`,
    name: `従業員${String(index + 1).padStart(2, "0")}`,
    roles: [...ROLES],
    availability: { start: 0, end: SLOT_COUNT },
    minShiftLength: MIN_SHIFT_LENGTH,
    maxShiftLength: MAX_SHIFT_LENGTH,
  }));
  const requirements: SlotRequirements[] = Array.from({ length: SLOT_COUNT }, () => ({
    hall: 1,
    hot: 1,
    cold: 1,
    dishwashing: 1,
  }));
  return { employees, requirements, pinnedAssignments: [] };
}

describe("readScheduleSolution", () => {
  it("reads assignments and shortage values by variable name from an optimal result", () => {
    const model = buildLpModel(createUpperBoundInput());
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
    const model = buildLpModel(createUpperBoundInput());
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
