// ソルバー出力（HiGHS の生の解）の解釈（純関数）。もとは `src/poc/solution.ts`。
// 契約により `raw` は `unknown` を受け取り、ここで HiGHS の解の形へ絞り込む。
import type { StoredSolution } from "../domain/day";
import type { HighsSolution } from "./solver-loader";
import type { LpModel } from "./model";

function primalValue(result: HighsSolution, variableName: string): number {
  const column = result.Columns[variableName];
  return column && "Primal" in column ? column.Primal : 0;
}

export function readScheduleSolution(model: LpModel, raw: unknown): StoredSolution {
  const result = raw as HighsSolution;
  const assignments = model.candidates
    .filter((candidate) => primalValue(result, candidate.variableName) > 0.5)
    .map((candidate) => ({
      employeeId: candidate.employeeId,
      role: candidate.role,
      start: candidate.start,
      length: candidate.length,
    }));
  const shortages = model.shortageVariables.map((shortage) => ({
    slot: shortage.slot,
    role: shortage.role,
    amount: primalValue(result, shortage.name),
  }));

  return {
    status: result.Status,
    objectiveValue: result.ObjectiveValue,
    assignments,
    shortages,
  };
}
