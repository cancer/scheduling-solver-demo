import type { LpModel, ScheduleSolution, SolveResponse } from "./types";

export function formatSolveResponse(solution: ScheduleSolution, model: LpModel): SolveResponse {
  return {
    status: solution.status,
    objectiveValue: solution.objectiveValue,
    assignments: solution.assignments,
    shortages: solution.shortages,
    model: {
      binaryVariableCount: model.binaryVariableNames.length,
      shortageVariableCount: model.shortageVariables.length,
      penaltyM: model.penaltyM,
    },
  };
}
