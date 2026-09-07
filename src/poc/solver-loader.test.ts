import { describe, expect, it, vi } from "vitest";

import { createInstantiateWasm, loadHighs, provideWorkerLocationForHighs } from "./solver-loader";
import type { HighsLoader, HighsSolver, WorkerHighsLoaderOptions } from "./solver-loader";

const emptyWasmModule = new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));

describe("createInstantiateWasm", () => {
  it("passes the synchronously-created instance and module to the callback without returning the instance", () => {
    const successCallback = vi.fn();
    const instantiateWasm = createInstantiateWasm(emptyWasmModule);

    const returnValue = instantiateWasm({}, successCallback);

    expect(returnValue).toBeUndefined();
    expect(successCallback).toHaveBeenCalledTimes(1);
    expect(successCallback.mock.calls[0][0]).toBeInstanceOf(WebAssembly.Instance);
    expect(successCallback.mock.calls[0][1]).toBe(emptyWasmModule);
  });
});

describe("loadHighs", () => {
  it("passes an instantiateWasm option to the injected loader", async () => {
    let receivedOptions: WorkerHighsLoaderOptions | undefined;
    const fakeSolver = { solve: vi.fn() } as unknown as HighsSolver;
    const fakeLoader: HighsLoader = async (options) => {
      receivedOptions = options as WorkerHighsLoaderOptions;
      return fakeSolver;
    };

    const loadedSolver = await loadHighs(fakeLoader, emptyWasmModule);

    expect(loadedSolver).toBe(fakeSolver);
    expect(receivedOptions?.instantiateWasm).toEqual(expect.any(Function));
  });

  it("does not mutate Node's process version", async () => {
    const globalScope = globalThis as unknown as {
      process?: { versions?: { node?: unknown } };
    };
    const originalNodeVersion = globalScope.process?.versions?.node;
    const fakeSolver = { solve: vi.fn() } as unknown as HighsSolver;
    const fakeLoader: HighsLoader = async () => fakeSolver;

    await expect(loadHighs(fakeLoader, emptyWasmModule)).resolves.toBe(fakeSolver);

    expect(globalScope.process?.versions?.node).toBe(originalNodeVersion);
  });
});

describe("provideWorkerLocationForHighs", () => {
  it("applies compatibility shims to a Worker-like scope", () => {
    const workerScope: {
      WorkerGlobalScope: object;
      self: { location?: { href: string } };
      process: { versions: { node?: unknown } };
    } = {
      WorkerGlobalScope: {},
      self: {},
      process: { versions: { node: "22" } },
    };

    provideWorkerLocationForHighs(workerScope);

    expect(workerScope.self.location).toEqual({ href: "" });
    expect(workerScope.process.versions.node).toBeUndefined();
  });
});
