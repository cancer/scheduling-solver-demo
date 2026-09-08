// 製品 Worker から HiGHS を初期化する唯一の入口。`$lib/solver/solve` の
// `createScheduleSolver` は `wasmModule` だけを受け取る形（契約 `src/lib/solver/solve.ts`）
// なので、実際の `.wasm` バイナリを読み込む場所をここに閉じる（`src/poc/worker.ts` が
// PoC 側で同じ役割を持つのと対になる）。
import highsWasmModule from "../../../node_modules/highs/build/highs.wasm";

import { createScheduleSolver } from "../solver/solve";
import type { ScheduleSolver } from "../solver/solve";

let cachedSolver: ScheduleSolver | undefined;

/** 製品 Worker 用の `ScheduleSolver`。呼び出しのたびに wasm を読み直さないよう1つに保つ。 */
export function getScheduleSolver(): ScheduleSolver {
  cachedSolver ??= createScheduleSolver(highsWasmModule);
  return cachedSolver;
}
