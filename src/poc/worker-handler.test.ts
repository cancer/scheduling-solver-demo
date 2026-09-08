import { describe, expect, it, vi } from "vitest";

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

// Acceptance-contract data is written here independently of buildLpModel and its fixture.
const upperBoundRoles = ["hall", "hot", "cold", "dishwashing"] as const;
const upperBoundSlotCount = 28;
const upperBoundEmployeeCount = 10;
const upperBoundMinimumShiftLength = 8;
const upperBoundMaximumShiftLength = 16;

type FakeColumn = {
  Index: number;
  Lower: number;
  Upper: number;
  Primal: number;
  Type: "Integer" | "Continuous";
  Name: string;
};

function padded(value: number): string {
  return String(value).padStart(2, "0");
}

function createExpectedUpperBoundCandidateNames(): string[] {
  const names: string[] = [];

  for (let employeeNumber = 1; employeeNumber <= upperBoundEmployeeCount; employeeNumber += 1) {
    for (const role of upperBoundRoles) {
      for (
        let length = upperBoundMinimumShiftLength;
        length <= upperBoundMaximumShiftLength;
        length += 1
      ) {
        for (let start = 0; start + length <= upperBoundSlotCount; start += 1) {
          names.push(
            `x_employee_${padded(employeeNumber)}_${role}_s${padded(start)}_l${padded(length)}`,
          );
        }
      }
    }
  }

  return names;
}

function createExpectedUpperBoundShortageNames(): string[] {
  return Array.from({ length: upperBoundSlotCount }, (_, slot) =>
    upperBoundRoles.map((role) => `u_t${padded(slot)}_${role}`),
  ).flat();
}

function createAcceptedHighsSolution(): HighsSolution {
  const selectedAssignments = new Set([
    "x_employee_01_hall_s00_l15",
    "x_employee_03_cold_s00_l15",
    "x_employee_04_dishwashing_s00_l15",
    "x_employee_05_hot_s13_l15",
    "x_employee_07_dishwashing_s13_l15",
    "x_employee_08_hall_s13_l15",
    "x_employee_09_hot_s00_l15",
    "x_employee_10_cold_s13_l15",
  ]);
  const columns: Record<string, FakeColumn> = {};
  const candidateNames = createExpectedUpperBoundCandidateNames();
  const shortageNames = createExpectedUpperBoundShortageNames();

  candidateNames.forEach((name, index) => {
    columns[name] = {
      Index: index,
      Lower: 0,
      Upper: 1,
      Primal: selectedAssignments.has(name) ? 1 : 0,
      Type: "Integer",
      Name: name,
    };
  });
  shortageNames.forEach((name, index) => {
    columns[name] = {
      Index: candidateNames.length + index,
      Lower: 0,
      Upper: Infinity,
      Primal: 0,
      Type: "Continuous",
      Name: name,
    };
  });

  return {
    Status: "Optimal",
    ObjectiveValue: 120,
    Columns: columns,
    Rows: [],
  } as HighsSolution;
}

const expectedAssignments = [
  { employeeId: "employee-01", role: "hall", start: 0, length: 15, end: 15 },
  { employeeId: "employee-03", role: "cold", start: 0, length: 15, end: 15 },
  { employeeId: "employee-04", role: "dishwashing", start: 0, length: 15, end: 15 },
  { employeeId: "employee-05", role: "hot", start: 13, length: 15, end: 28 },
  { employeeId: "employee-07", role: "dishwashing", start: 13, length: 15, end: 28 },
  { employeeId: "employee-08", role: "hall", start: 13, length: 15, end: 28 },
  { employeeId: "employee-09", role: "hot", start: 0, length: 15, end: 15 },
  { employeeId: "employee-10", role: "cold", start: 13, length: 15, end: 28 },
] as const;

const expectedShortages = Array.from({ length: upperBoundSlotCount }, (_, slot) =>
  upperBoundRoles.map((role) => ({ slot, role, amount: 0 })),
).flat();

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
    expect(body.assignments).toEqual(expectedAssignments);
    expect(body.shortages).toEqual(expectedShortages);
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
