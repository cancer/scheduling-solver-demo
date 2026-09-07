import { describe, expect, it, vi } from "vitest";

import { createInstantiateWasm, loadHighs, prepareHighsWorkerEnvironment } from "./solver-loader";
import type {
  HighsGlobalScopeForHighs,
  HighsLoader,
  HighsSolver,
  WorkerHighsLoaderOptions,
} from "./solver-loader";

const emptyWasmModule = new WebAssembly.Module(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]));
const importingWasmModule = new WebAssembly.Module(
  new Uint8Array([
    0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 127, 2, 13, 1, 3, 101, 110, 118, 5, 118, 97,
    108, 117, 101, 0, 0, 3, 2, 1, 0, 7, 8, 1, 4, 114, 101, 97, 100, 0, 1, 10, 6, 1, 4, 0, 16, 0, 11,
  ]),
);

describe("createInstantiateWasm", () => {
  it("passes the synchronously-created instance and module to the callback without returning the instance", () => {
    let callbackCount = 0;
    let receivedInstance: WebAssembly.Instance | undefined;
    let receivedModule: WebAssembly.Module | undefined;
    const successCallback = (instance: WebAssembly.Instance, module: WebAssembly.Module): void => {
      callbackCount += 1;
      receivedInstance = instance;
      receivedModule = module;
    };
    const instantiateWasm = createInstantiateWasm(importingWasmModule);
    const imports = { env: { value: () => 7 } };

    const returnValue = instantiateWasm(imports, successCallback);

    expect(returnValue).toBeUndefined();
    expect(callbackCount).toBe(1);
    expect(receivedInstance).toBeInstanceOf(WebAssembly.Instance);
    expect(receivedModule).toBe(importingWasmModule);
    const read = receivedInstance?.exports.read;
    expect(read).toEqual(expect.any(Function));
    expect((read as () => number)()).toBe(7);
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
    const preparedEnvironment = prepareHighsWorkerEnvironment({});

    const loadedSolver = await loadHighs(fakeLoader, importingWasmModule, preparedEnvironment);

    expect(loadedSolver).toBe(fakeSolver);
    const instantiateWasm = receivedOptions?.instantiateWasm;
    expect(instantiateWasm).toEqual(expect.any(Function));
    if (!instantiateWasm) {
      throw new Error("instantiateWasm was not passed to the loader");
    }

    let callbackCount = 0;
    let receivedInstance: WebAssembly.Instance | undefined;
    let receivedModule: WebAssembly.Module | undefined;
    const returnValue = instantiateWasm({ env: { value: () => 11 } }, (instance, module) => {
      callbackCount += 1;
      receivedInstance = instance;
      receivedModule = module;
    });

    expect(returnValue).toBeUndefined();
    expect(callbackCount).toBe(1);
    expect(receivedInstance).toBeInstanceOf(WebAssembly.Instance);
    expect(receivedModule).toBe(importingWasmModule);
    const read = receivedInstance?.exports.read;
    expect(read).toEqual(expect.any(Function));
    expect((read as () => number)()).toBe(11);
  });

  it("does not mutate Node's process version", async () => {
    const globalScope = globalThis as unknown as {
      process?: { versions?: { node?: unknown } };
    };
    const originalNodeVersion = globalScope.process?.versions?.node;
    const fakeSolver = { solve: vi.fn() } as unknown as HighsSolver;
    const fakeLoader: HighsLoader = async () => fakeSolver;
    const preparedEnvironment = prepareHighsWorkerEnvironment({});

    await expect(loadHighs(fakeLoader, emptyWasmModule, preparedEnvironment)).resolves.toBe(
      fakeSolver,
    );

    expect(globalScope.process?.versions?.node).toBe(originalNodeVersion);
  });
});

describe("prepareHighsWorkerEnvironment", () => {
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

    const preparedEnvironment = prepareHighsWorkerEnvironment(workerScope);

    expect(workerScope.self.location).toEqual({ href: "" });
    expect(workerScope.process.versions.node).toBeUndefined();
    expect(preparedEnvironment).toEqual({ prepared: true });
  });

  it("does not prepare another global scope while loading", async () => {
    const preparedScope: {
      WorkerGlobalScope: object;
      self: { location?: { href: string } };
      process: { versions: { node?: unknown } };
    } = {
      WorkerGlobalScope: {},
      self: {},
      process: { versions: { node: "22" } },
    };
    const preparedEnvironment = prepareHighsWorkerEnvironment(preparedScope);
    const runtimeScope: {
      WorkerGlobalScope: object;
      self: { location?: { href: string } };
      process: { versions: { node?: unknown } };
    } = {
      WorkerGlobalScope: {},
      self: {},
      process: { versions: { node: "22" } },
    };
    vi.stubGlobal("WorkerGlobalScope", runtimeScope.WorkerGlobalScope);
    vi.stubGlobal("self", runtimeScope.self);
    vi.stubGlobal("process", runtimeScope.process);

    const fakeSolver = { solve: vi.fn() } as unknown as HighsSolver;
    const fakeLoader: HighsLoader = async () => fakeSolver;

    try {
      await loadHighs(fakeLoader, emptyWasmModule, preparedEnvironment);
    } finally {
      vi.unstubAllGlobals();
    }

    expect(runtimeScope.self.location).toBeUndefined();
    expect(runtimeScope.process.versions.node).toBe("22");
  });

  it("preserves an existing location and leaves an absent Node version unchanged", () => {
    const existingLocation = { href: "https://example.test/" };
    const workerScope: HighsGlobalScopeForHighs = {
      WorkerGlobalScope: {},
      self: { location: existingLocation },
      process: { versions: {} },
    };

    const preparedEnvironment = prepareHighsWorkerEnvironment(workerScope);

    expect(preparedEnvironment).toEqual({ prepared: true });
    expect(workerScope.self?.location).toBe(existingLocation);
    expect(workerScope.process?.versions).toEqual({});
  });
});
