// ソルバー実行。もとは `src/poc/solver.ts`（`solveSchedule`）+ `src/poc/worker-app.ts`
// （HiGHS 初期化の配線）を、契約のモジュール境界（`createScheduleSolver`）へまとめた。
import highsLoader from "highs";

import { loadHighs, prepareHighsWorkerEnvironment } from "./solver-loader";
import type { HighsGlobalScopeForHighs, HighsSolver } from "./solver-loader";
import { buildLpModel } from "./model";
import type { LpModel, SolveInput } from "./model";
import { readScheduleSolution } from "./solution";
import type { StoredSolution } from "../domain/day";

export const SOLVER_OPTIONS = {
  output_flag: false,
  log_to_console: false,
  random_seed: 0,
} as const;

/** 構築済みの LP モデルをソルバーに渡す下位レベルの API。
 * PoC の測定ハーネス（`src/poc/worker-handler.ts`）は LP 構築と求解を別フェーズとして
 * 計測するため、モデル構築済みの状態から呼べるこの形を維持する。 */
export function solveSchedule(solver: HighsSolver, model: LpModel): StoredSolution {
  const result = solver.solve(model.lpText, SOLVER_OPTIONS);
  return readScheduleSolution(model, result);
}

export type ScheduleSolver = Readonly<{ solve(input: SolveInput): Promise<StoredSolution> }>;

/**
 * 契約のモジュール境界（`createScheduleSolver`）。`wasmModule` だけを受け取り、HiGHS の
 * 読み込み（`highs@1.14.2` 用の workerd 互換対応を含む）と LP 構築・求解をまとめて行う。
 *
 * 契約 (`contract.md`) は `solve` の戻り値型を `StoredSolution`（非 Promise）と書いているが、
 * HiGHS の読み込み自体が非同期（`HighsLoader` は Promise を返す）であるため、同期シグネチャ
 * では実装できない。`Promise<StoredSolution>` として実装している（team-lead へ報告済み）。
 */
export function createScheduleSolver(wasmModule: WebAssembly.Module): ScheduleSolver {
  return {
    async solve(input: SolveInput): Promise<StoredSolution> {
      const workerScope = globalThis as unknown as HighsGlobalScopeForHighs;
      // highs@1.14.2 はこれらのグローバルを読みながらロードするため、準備は loadHighs より先。
      const preparedEnvironment = prepareHighsWorkerEnvironment(workerScope);
      const solver = await loadHighs(highsLoader, wasmModule, preparedEnvironment);
      const model = buildLpModel(input);
      return solveSchedule(solver, model);
    },
  };
}
