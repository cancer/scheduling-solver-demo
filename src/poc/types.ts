// シフト管理ドメインの共通の型・定数（役割・従業員・出勤可能時間帯・必要人数）は
// `$lib/domain/shift` へ移設した（工程2）。ここには PoC の求解ロジック固有の型
// （LP モデル・求解結果・レスポンス整形）だけを残す。
import type { Employee, Role, SlotRequirements } from "$lib/domain/shift";

export type ScheduleFixture = Readonly<{
  employees: readonly Employee[];
  requirements: readonly SlotRequirements[];
}>;

export type ShiftCandidate = Readonly<{
  employeeId: string;
  role: Role;
  start: number;
  length: number;
  end: number;
  variableName: string;
}>;

export type ShortageVariable = Readonly<{
  slot: number;
  role: Role;
  name: string;
}>;

export type LpModel = Readonly<{
  lpText: string;
  candidates: readonly ShiftCandidate[];
  binaryVariableNames: readonly string[];
  shortageVariables: readonly ShortageVariable[];
  penaltyM: number;
}>;

export type ScheduleAssignment = Readonly<{
  employeeId: string;
  role: Role;
  start: number;
  length: number;
  end: number;
}>;

export type ScheduleShortage = Readonly<{
  slot: number;
  role: Role;
  amount: number;
}>;

export type ScheduleSolution = Readonly<{
  status: string;
  objectiveValue: number;
  assignments: readonly ScheduleAssignment[];
  shortages: readonly ScheduleShortage[];
}>;

export type SolveResponse = Readonly<{
  status: string;
  objectiveValue: number;
  assignments: readonly ScheduleAssignment[];
  shortages: readonly ScheduleShortage[];
  model: Readonly<{
    binaryVariableCount: number;
    shortageVariableCount: number;
    penaltyM: number;
  }>;
}>;
