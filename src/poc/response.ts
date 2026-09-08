import type { StoredSolution } from "$lib/domain/day";
import type { LpModel } from "$lib/solver/model";
import type { SolveResponse } from "./types";

export function formatSolveResponse(solution: StoredSolution, model: LpModel): SolveResponse {
  return {
    status: solution.status,
    objectiveValue: solution.objectiveValue,
    assignments: solution.assignments.map((assignment) => ({
      ...assignment,
      end: assignment.start + assignment.length,
    })),
    shortages: solution.shortages,
    model: {
      binaryVariableCount: model.binaryVariableNames.length,
      shortageVariableCount: model.shortageVariables.length,
      penaltyM: model.penaltyM,
    },
  };
}
