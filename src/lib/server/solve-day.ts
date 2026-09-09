import type { Employee } from "../domain/shift";
import type { DayAvailability, DayData, StoredAssignment, StoredSolution } from "../domain/day";
import type { SolveInput } from "../solver/model";
import type { StoredEmployee } from "./db/employees";

// `POST /api/days/[date]/solve` の求解ロジック（純関数）。ソルバーの実体
// （`$lib/solver`）には依存せず、`SolveInput` / `ScheduleSolver`（工程3 が作る
// モジュール境界）の「型」だけを使う。ソルバーの呼び出しは呼び出し側
// （`+server.ts`）が行い、ここでは受け取った結果を組み立てるだけにする。

/**
 * 従業員一覧に、その日の出勤可能時間帯を載せる。当日の出勤可能時間帯が
 * 無い従業員（未入力）は「その日の休み」として除外する
 * （契約: 「availability は日付データ側の値を載せて渡す」）。
 */
export function attachDayAvailability(
  employees: readonly StoredEmployee[],
  availability: DayAvailability,
): readonly Employee[] {
  return employees.flatMap((employee) => {
    const window = availability[employee.id];
    return window === undefined ? [] : [{ ...employee, availability: window }];
  });
}

/** 求解対象（`SolveInput`）を組み立てる。 */
export function buildSolveInput(params: {
  employees: readonly StoredEmployee[];
  day: DayData;
  pinnedAssignments: readonly StoredAssignment[];
}): SolveInput {
  return {
    employees: attachDayAvailability(params.employees, params.day.availability),
    requirements: params.day.requirements,
    pinnedAssignments: params.pinnedAssignments,
  };
}

/**
 * 求解結果を日付データへ反映する。必要人数・出勤可能時間帯はそのまま保ち、
 * 固定割当と求解結果だけを置き換える（契約:
 * 「保存する結果は『固定した割当 + ソルバー出力』とする。再求解で固定割当が
 * 消えないこと」）。
 */
export function applySolution(
  day: DayData,
  pinnedAssignments: readonly StoredAssignment[],
  solution: StoredSolution,
): DayData {
  return {
    requirements: day.requirements,
    availability: day.availability,
    pinnedAssignments,
    solution,
  };
}
