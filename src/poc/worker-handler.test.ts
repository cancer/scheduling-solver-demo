import { describe, expect, it } from "vitest";

import { createWorkerHandler } from "./worker-handler";
import { createWorkerApp } from "./worker-app";
import type { HighsLoader, HighsSolver, HighsSolution } from "./solver-loader";

const optimalWithoutAssignments: HighsSolution = {
  Status: "Optimal",
  ObjectiveValue: 0,
  Columns: {},
  Rows: [],
} as HighsSolution;

describe("createWorkerHandler", () => {
  it("returns the solved upper-bound fixture as JSON", async () => {
    const fakeSolver: HighsSolver = {
      solve: () => optimalWithoutAssignments,
    };
    const handler = createWorkerHandler(Promise.resolve(fakeSolver));

    const response = await handler(new Request("https://example.test/"));
    const body = JSON.parse(await response.text()) as {
      status: string;
      model: {
        binaryVariableCount: number;
        shortageVariableCount: number;
        penaltyM: number;
      };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body.status).toBe("Optimal");
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
});
