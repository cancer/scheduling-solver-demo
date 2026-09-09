// PoC 測定ハーネス固有の型。LP モデル・求解ロジック本体の型は `$lib/solver/model` /
// `$lib/domain/day` へ移設した（工程3）。ここには測定用フィクスチャとレスポンス整形
// （`end` を含む、人が読みやすい形）だけを残す。
import type { Employee, Role, SlotRequirements } from "$lib/domain/shift";
import type { StoredShortage } from "$lib/domain/day";

export type ScheduleFixture = Readonly<{
  employees: readonly Employee[];
  requirements: readonly SlotRequirements[];
}>;

/** PoC のレスポンス表示専用。`$lib/domain/day` の `StoredAssignment` は `end` を持たない
 * （日をまたいで保存する型に含める理由が無いため）が、PoC の出力は読みやすさのために
 * `end` を添える。 */
export type ScheduleAssignment = Readonly<{
  employeeId: string;
  role: Role;
  start: number;
  length: number;
  end: number;
}>;

export type SolveResponse = Readonly<{
  status: string;
  objectiveValue: number;
  assignments: readonly ScheduleAssignment[];
  shortages: readonly StoredShortage[];
  model: Readonly<{
    binaryVariableCount: number;
    shortageVariableCount: number;
    penaltyM: number;
  }>;
}>;
