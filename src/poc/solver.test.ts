import { describe, expect, it } from "vitest";

import { createUpperBoundFixture } from "./fixture";
import { buildLpModel } from "./lp";
import { solveSchedule } from "./solver";
import type { HighsSolution, HighsSolver } from "./solver-loader";

describe("solveSchedule", () => {
  it("passes the required quiet deterministic options without a time limit", () => {
    const model = buildLpModel(createUpperBoundFixture());
    const result = {
      Status: "Optimal",
      ObjectiveValue: 0,
      Columns: {},
      Rows: [],
    } as HighsSolution;
    let receivedProblem = "";
    let receivedOptions: unknown;
    const fakeSolver: HighsSolver = {
      solve(problem, options) {
        receivedProblem = problem;
        receivedOptions = options;
        return result;
      },
    };

    solveSchedule(fakeSolver, model);

    expect(receivedProblem).toBe(model.lpText);
    expect(receivedOptions).toEqual({
      output_flag: false,
      log_to_console: false,
      random_seed: 0,
    });
    expect(receivedOptions).not.toHaveProperty("time_limit");
  });
});
