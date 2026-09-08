import type { Role, SlotRequirements } from "./shift";

// 日付に属するデータの型（工程2）。要件書「日付と従業員のデータ所有範囲を定める」の
// 「出勤可能時間帯」「必要人数」「固定割当と求解結果」に対応する。
// `src/poc` の LP/求解結果の型（`ScheduleAssignment` 等、`src/poc/types.ts`）とは
// 目的が異なるため独立させている（`src/poc` は再現用ハーネスであり、製品コードが
// そこへ依存する形にしない）。

/** 従業員ごとの当日の出勤可能時間帯。未入力（このマップに存在しない）は休み。 */
export type DayAvailability = Readonly<Record<string, { start: number; end: number }>>;

/** ピン留めされた割当、および求解結果に含まれる割当。 */
export type StoredAssignment = Readonly<{
  employeeId: string;
  role: Role;
  start: number;
  length: number;
}>;

export type StoredShortage = Readonly<{
  slot: number;
  role: Role;
  amount: number;
}>;

export type StoredSolution = Readonly<{
  status: string;
  objectiveValue: number;
  assignments: readonly StoredAssignment[];
  shortages: readonly StoredShortage[];
}>;

/** 日付に属する1日分のデータ（「1日1枚」の論理単位）。 */
export type DayData = Readonly<{
  requirements: readonly SlotRequirements[];
  availability: DayAvailability;
  pinnedAssignments: readonly StoredAssignment[];
  solution: StoredSolution | null;
}>;
