import { buildLpModel } from "$lib/solver/model";
import type { LpModel } from "$lib/solver/model";
import { solveSchedule } from "$lib/solver/solve";
import type { HighsSolver } from "$lib/solver/solver-loader";

import { createUpperBoundFixture } from "./fixture";
import { formatSolveResponse } from "./response";
import type { ScheduleFixture } from "./types";

type SolverFactory = () => Promise<HighsSolver>;

function logFailure(event: string, cause: unknown): void {
  const error =
    cause instanceof Error
      ? { name: cause.name, message: cause.message, stack: cause.stack }
      : { message: String(cause) };
  console.error({ event, error });
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function createWorkerHandler(
  createSolver: SolverFactory,
  fixture: ScheduleFixture = createUpperBoundFixture(),
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    if (request.method !== "GET") {
      return jsonResponse({ error: "GET required" }, 405);
    }

    let model: LpModel;
    try {
      model = buildLpModel({ ...fixture, pinnedAssignments: [] });
    } catch (cause) {
      logFailure("model_build_failed", cause);
      return jsonResponse({ error: "solver_failed" }, 500);
    }

    let solver: HighsSolver;

    try {
      solver = await createSolver();
    } catch (cause) {
      logFailure("highs_loader_initialization_failed", cause);
      return jsonResponse({ error: "solver_initialization_failed" }, 500);
    }

    try {
      const solution = solveSchedule(solver, model);
      if (solution.status !== "Optimal") {
        console.warn({ event: "highs_non_optimal_result", status: solution.status });
      }
      return jsonResponse(formatSolveResponse(solution, model), 200);
    } catch (cause) {
      logFailure("solver_failed", cause);
      return jsonResponse({ error: "solver_failed" }, 500);
    }
  };
}
