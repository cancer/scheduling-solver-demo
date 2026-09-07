import { createUpperBoundFixture } from "./fixture";
import { buildLpModel } from "./lp";
import { formatSolveResponse } from "./response";
import { solveSchedule } from "./solver";
import type { HighsSolver } from "./solver-loader";
import type { ScheduleFixture } from "./types";

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function createWorkerHandler(
  solverPromise: Promise<HighsSolver>,
  fixture: ScheduleFixture = createUpperBoundFixture(),
): (request: Request) => Promise<Response> {
  const model = buildLpModel(fixture);

  return async (request: Request): Promise<Response> => {
    if (request.method !== "GET") {
      return jsonResponse({ error: "GET required" }, 405);
    }

    try {
      const solver = await solverPromise;
      const solution = solveSchedule(solver, model);
      return jsonResponse(formatSolveResponse(solution, model), 200);
    } catch {
      return jsonResponse({ error: "solver_failed" }, 500);
    }
  };
}
