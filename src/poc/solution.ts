import type { HighsSolution } from "./solver-loader";
import type { LpModel, ScheduleSolution } from "./types";

function primalValue(result: HighsSolution, variableName: string): number {
  const column = result.Columns[variableName];
  return column && "Primal" in column ? column.Primal : 0;
}

export function readScheduleSolution(model: LpModel, result: HighsSolution): ScheduleSolution {
  const assignments = model.candidates
    .filter((candidate) => primalValue(result, candidate.variableName) > 0.5)
    .map((candidate) => ({
      employeeId: candidate.employeeId,
      role: candidate.role,
      start: candidate.start,
      length: candidate.length,
      end: candidate.end,
    }));
  const shortages = model.shortageVariables.map((shortage) => ({
    slot: shortage.slot,
    role: shortage.role,
    amount: primalValue(result, shortage.name),
  }));

  return {
    status: result.Status,
    objectiveValue: result.ObjectiveValue,
    assignments,
    shortages,
  };
}
