import { loadHighs, prepareHighsWorkerEnvironment } from "./solver-loader";
import { createWorkerHandler } from "./worker-handler";
import type { HighsGlobalScopeForHighs, HighsLoader } from "./solver-loader";

export function createWorkerApp(
  loader: HighsLoader,
  wasmModule: WebAssembly.Module,
): (request: Request) => Promise<Response> {
  const workerScope = globalThis as unknown as HighsGlobalScopeForHighs;
  // highs@1.14.2 reads these globals while loading, so preparation must precede loadHighs.
  const preparedEnvironment = prepareHighsWorkerEnvironment(workerScope);

  return createWorkerHandler(loadHighs(loader, wasmModule, preparedEnvironment));
}
