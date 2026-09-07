import { describe, expect, it, vi } from "vitest";

import { createUpperBoundFixture } from "./fixture";
import { buildLpModel } from "./lp";
import * as solverLoader from "./solver-loader";
import { createWorkerHandler } from "./worker-handler";
import { createWorkerApp } from "./worker-app";
import type { HighsLoader, HighsSolver, HighsSolution } from "./solver-loader";

const optimalWithoutAssignments: HighsSolution = {
  Status: "Optimal",
  ObjectiveValue: 0,
  Columns: {},
  Rows: [],
} as HighsSolution;

type FakeColumn = {
  Index: number;
  Lower: number;
  Upper: number;
  Primal: number;
  Type: "Integer" | "Continuous";
  Name: string;
};

function createAcceptedHighsSolution(): HighsSolution {
  const model = buildLpModel(createUpperBoundFixture());
  const selectedAssignments = new Set([
    "employee-01|hall|0",
    "employee-03|cold|0",
    "employee-04|dishwashing|0",
    "employee-05|hot|13",
    "employee-07|dishwashing|13",
    "employee-08|hall|13",
    "employee-09|hot|0",
    "employee-10|cold|13",
  ]);
  const columns: Record<string, FakeColumn> = {};

  model.candidates.forEach((candidate, index) => {
    columns[candidate.variableName] = {
      Index: index,
      Lower: 0,
      Upper: 1,
      Primal:
        candidate.length === 15 &&
        selectedAssignments.has(`${candidate.employeeId}|${candidate.role}|${candidate.start}`)
          ? 1
          : 0,
      Type: "Integer",
      Name: candidate.variableName,
    };
  });
  model.shortageVariables.forEach((shortage, index) => {
    columns[shortage.name] = {
      Index: model.candidates.length + index,
      Lower: 0,
      Upper: Infinity,
      Primal: 0,
      Type: "Continuous",
      Name: shortage.name,
    };
  });

  return {
    Status: "Optimal",
    ObjectiveValue: 120,
    Columns: columns,
    Rows: [],
  } as HighsSolution;
}

describe("createWorkerHandler", () => {
  it("returns the accepted upper-bound solution as formatted JSON", async () => {
    const fakeSolver: HighsSolver = {
      solve: () => createAcceptedHighsSolution(),
    };
    const handler = createWorkerHandler(Promise.resolve(fakeSolver));

    const response = await handler(new Request("https://example.test/"));
    const body = JSON.parse(await response.text()) as {
      status: string;
      objectiveValue: number;
      assignments: readonly { length: number }[];
      shortages: readonly { amount: number }[];
      model: {
        binaryVariableCount: number;
        shortageVariableCount: number;
        penaltyM: number;
      };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body.status).toBe("Optimal");
    expect(body.objectiveValue).toBe(120);
    expect(body.assignments).toHaveLength(8);
    expect(body.assignments.every((assignment) => assignment.length === 15)).toBe(true);
    expect(body.shortages).toHaveLength(112);
    expect(body.shortages.every((shortage) => shortage.amount === 0)).toBe(true);
    expect(body.model).toEqual({
      binaryVariableCount: 6120,
      shortageVariableCount: 112,
      penaltyM: 161,
    });
  });

  it("rejects non-GET requests without solving", async () => {
    let solveCalled = false;
    const fakeSolver: HighsSolver = {
      solve: () => {
        solveCalled = true;
        return optimalWithoutAssignments;
      },
    };
    const handler = createWorkerHandler(Promise.resolve(fakeSolver));

    const response = await handler(new Request("https://example.test/", { method: "POST" }));

    expect(response.status).toBe(405);
    expect(solveCalled).toBe(false);
  });

  it("returns a server error when solving fails", async () => {
    const handler = createWorkerHandler(Promise.reject(new Error("solver failed")));

    const response = await handler(new Request("https://example.test/"));

    expect(response.status).toBe(500);
  });

  it("builds the Worker app around the injected loader and module", async () => {
    const fakeSolver: HighsSolver = {
      solve: () => optimalWithoutAssignments,
    };
    const fakeLoader: HighsLoader = async () => fakeSolver;
    const emptyWasmModule = new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
    const app = createWorkerApp(fakeLoader, emptyWasmModule);

    const response = await app(new Request("https://example.test/"));

    expect(response.status).toBe(200);
  });

  it("observes Worker preparation before the real app loads HiGHS", () => {
    const prepareSpy = vi.spyOn(solverLoader, "prepareHighsWorkerEnvironment");
    const loadSpy = vi.spyOn(solverLoader, "loadHighs");
    const fakeSolver: HighsSolver = {
      solve: () => optimalWithoutAssignments,
    };
    const fakeLoader: HighsLoader = async () => fakeSolver;
    const emptyWasmModule = new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));

    try {
      createWorkerApp(fakeLoader, emptyWasmModule);

      expect(prepareSpy).toHaveBeenCalledTimes(1);
      expect(loadSpy).toHaveBeenCalledTimes(1);
      const preparationCall = prepareSpy.mock.invocationCallOrder[0];
      const loadingCall = loadSpy.mock.invocationCallOrder[0];
      expect(preparationCall).toBeDefined();
      expect(loadingCall).toBeDefined();
      expect(preparationCall).toBeLessThan(loadingCall);
    } finally {
      prepareSpy.mockRestore();
      loadSpy.mockRestore();
    }
  });
});
