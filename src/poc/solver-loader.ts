import type highsLoader from "highs";

export type HighsLoader = typeof highsLoader;
export type HighsSolver = Awaited<ReturnType<HighsLoader>>;
export type HighsSolution = ReturnType<HighsSolver["solve"]>;

export type InstantiateWasm = (
  imports: WebAssembly.Imports,
  successCallback: (instance: WebAssembly.Instance, module: WebAssembly.Module) => void,
) => void;

type HighsLoaderOptions = NonNullable<Parameters<typeof highsLoader>[0]>;
export type WorkerHighsLoaderOptions = HighsLoaderOptions & {
  instantiateWasm: InstantiateWasm;
};

type WorkerScopeForHighs = {
  location?: {
    href: string;
  };
};

type NodeCompatibilityScopeForHighs = {
  versions?: {
    node?: unknown;
  };
};

export type HighsGlobalScopeForHighs = {
  WorkerGlobalScope?: unknown;
  self?: WorkerScopeForHighs;
  process?: NodeCompatibilityScopeForHighs;
};

export type PreparedHighsWorkerEnvironment = {
  readonly prepared: true;
};

export function prepareHighsWorkerEnvironment(
  globalScope: HighsGlobalScopeForHighs,
): PreparedHighsWorkerEnvironment {
  const preparedEnvironment: PreparedHighsWorkerEnvironment = { prepared: true };

  // Node exposes a read-only process.versions.node. Only the Workers global
  // needs the compatibility adjustments below for highs@1.14.2.
  if (!globalScope.WorkerGlobalScope) {
    return preparedEnvironment;
  }
  if (globalScope.self && !globalScope.self.location) {
    // highs@1.14.2 reads self.location.href before invoking instantiateWasm.
    // workerd provides self but not the browser location object.
    globalScope.self.location = { href: "" };
  }
  if (globalScope.process?.versions?.node) {
    // The Workers compatibility shim exposes process.versions.node, which
    // makes highs@1.14.2 enter its __dirname-based Node branch in workerd.
    globalScope.process.versions.node = undefined;
  }

  return preparedEnvironment;
}

export function createInstantiateWasm(wasmModule: WebAssembly.Module): InstantiateWasm {
  return (imports, successCallback): void => {
    const instance = new WebAssembly.Instance(wasmModule, imports);
    successCallback(instance, wasmModule);
  };
}

export function loadHighs(
  loader: HighsLoader,
  wasmModule: WebAssembly.Module,
  preparedEnvironment: PreparedHighsWorkerEnvironment,
): ReturnType<HighsLoader> {
  // The token proves that the Worker compatibility shim ran before this loader call.
  // Keep preparation at the caller so this ordering is visible at every call site.
  void preparedEnvironment;
  const options: WorkerHighsLoaderOptions = {
    instantiateWasm: createInstantiateWasm(wasmModule),
  };
  return loader(options);
}
