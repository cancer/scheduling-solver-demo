import { loadHighs } from "./solver-loader";
import { createWorkerHandler } from "./worker-handler";
import type { HighsLoader } from "./solver-loader";

export function createWorkerApp(
  loader: HighsLoader,
  wasmModule: WebAssembly.Module,
): (request: Request) => Promise<Response> {
  return createWorkerHandler(loadHighs(loader, wasmModule));
}
