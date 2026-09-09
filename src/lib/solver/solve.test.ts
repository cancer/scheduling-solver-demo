import { describe, expect, it, vi } from "vitest";

import { SLOT_COUNT } from "../domain/shift";

import { buildLpModel } from "./model";
import type { SolveInput } from "./model";
import { createScheduleSolver, solveSchedule, SOLVER_OPTIONS } from "./solve";
import type { HighsSolution, HighsSolver } from "./solver-loader";

const smallInput: SolveInput = {
  employees: [
    {
      id: "alpha",
      name: "Alpha",
      roles: ["hall"],
      availability: { start: 0, end: 4 },
      minShiftLength: 2,
      maxShiftLength: 2,
    },
  ],
  requirements: Array.from({ length: SLOT_COUNT }, () => ({
    hall: 0,
    hot: 0,
    cold: 0,
    dishwashing: 0,
  })),
  pinnedAssignments: [],
};

const { fakeSolver, fakeLoaderCalls } = vi.hoisted(() => {
  return {
    fakeSolver: { solve: vi.fn() } as unknown as HighsSolver,
    fakeLoaderCalls: [] as unknown[],
  };
});

vi.mock("highs", () => ({
  default: async (options: unknown) => {
    fakeLoaderCalls.push(options);
    return fakeSolver;
  },
}));

describe("solveSchedule", () => {
  it("passes the required quiet deterministic options without a time limit", () => {
    const model = buildLpModel(smallInput);
    const result = {
      Status: "Optimal",
      ObjectiveValue: 0,
      Columns: {},
      Rows: [],
    } as HighsSolution;
    let receivedProblem = "";
    let receivedOptions: unknown;
    const fakeHighsSolver: HighsSolver = {
      solve(problem, options) {
        receivedProblem = problem;
        receivedOptions = options;
        return result;
      },
    };

    solveSchedule(fakeHighsSolver, model);

    expect(receivedProblem).toBe(model.lpText);
    expect(receivedOptions).toEqual({
      output_flag: false,
      log_to_console: false,
      random_seed: 0,
    });
    expect(receivedOptions).not.toHaveProperty("time_limit");
  });
});

describe("createScheduleSolver", () => {
  it("loads HiGHS with the given wasm module and solves the input's LP model", async () => {
    fakeLoaderCalls.length = 0;
    const fakeResult: HighsSolution = {
      Status: "Optimal",
      ObjectiveValue: 5,
      Columns: {},
      Rows: [],
    } as HighsSolution;
    const solveSpy = vi.fn(() => fakeResult);
    (fakeSolver as { solve: typeof solveSpy }).solve = solveSpy;
    const wasmModule = new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));

    const solver = createScheduleSolver(wasmModule);
    const solution = await solver.solve(smallInput);

    expect(solution.status).toBe("Optimal");
    expect(solution.objectiveValue).toBe(5);
    expect(fakeLoaderCalls).toHaveLength(1);
    expect(solveSpy).toHaveBeenCalledWith(buildLpModel(smallInput).lpText, SOLVER_OPTIONS);
  });
});
