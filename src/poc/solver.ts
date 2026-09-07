import { readScheduleSolution } from "./solution";
import type { HighsSolver } from "./solver-loader";
import type { LpModel, ScheduleSolution } from "./types";

export const SOLVER_OPTIONS = {
  output_flag: false,
  log_to_console: false,
  random_seed: 0,
} as const;

export function solveSchedule(solver: HighsSolver, model: LpModel): ScheduleSolution {
  const result = solver.solve(model.lpText, SOLVER_OPTIONS);
  return readScheduleSolution(model, result);
}
