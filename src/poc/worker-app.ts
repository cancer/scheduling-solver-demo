import { loadHighs, prepareHighsWorkerEnvironment } from "$lib/solver/solver-loader";
import type { HighsGlobalScopeForHighs, HighsLoader } from "$lib/solver/solver-loader";

import { createWorkerHandler } from "./worker-handler";

export function createWorkerApp(
  loader: HighsLoader,
  wasmModule: WebAssembly.Module,
): (request: Request) => Promise<Response> {
  return createWorkerHandler(() => {
    const workerScope = globalThis as unknown as HighsGlobalScopeForHighs;
    // highs@1.14.2 reads these globals while loading, so preparation must precede loadHighs.
    const preparedEnvironment = prepareHighsWorkerEnvironment(workerScope);
    return loadHighs(loader, wasmModule, preparedEnvironment);
  });
}
