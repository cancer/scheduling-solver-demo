import highsLoader from "highs";
import highsWasmModule from "../../node_modules/highs/build/highs.wasm";

import { createWorkerApp } from "./worker-app";

export default {
  fetch: createWorkerApp(highsLoader, highsWasmModule),
};
