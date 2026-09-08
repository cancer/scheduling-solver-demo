import { SLOT_COUNT } from "../../domain/shift";
import type { SlotRequirements } from "../../domain/shift";
import type { DayAvailability } from "../../domain/day";
import type { StoredEmployee } from "./employees";

// 初期データ（seed）。初期化の投入元はこのモジュール1箇所に定める（決定9）。
// 求解結果と固定割当は含めない（決定10。初期状態は入力だけがあり未求解）。
// 必要人数の値は意図的に調整しない（決定11。ピーク帯を多め、開店前後を少なめにした
// 素直な値を置く。仕込みの人手は開店前後のコマのホット・コールドの必要人数として表す）。
// 従業員名・日付・出勤可能時間帯・必要人数の具体値はこのモジュールだけが持つ
// （要件書には書かない）。
//
// 営業時間 10:00〜24:00、30分コマで28コマ。コマ番号は10:00起点、30分刻み
// （コマ0=10:00-10:30、コマ4=12:00、コマ8=14:00、コマ18=19:00、コマ26=23:00、
//  コマ27=23:30-24:00）。

export const SEED_EMPLOYEES: readonly StoredEmployee[] = [
  { id: "seed-hall-1", name: "サラ", roles: ["hall"], minShiftLength: 8, maxShiftLength: 16 },
  { id: "seed-hall-2", name: "タロウ", roles: ["hall"], minShiftLength: 8, maxShiftLength: 16 },
  { id: "seed-hot-1", name: "ケンジ", roles: ["hot"], minShiftLength: 8, maxShiftLength: 16 },
  { id: "seed-hot-2", name: "ユミ", roles: ["hot"], minShiftLength: 8, maxShiftLength: 16 },
  { id: "seed-cold-1", name: "アヤ", roles: ["cold"], minShiftLength: 8, maxShiftLength: 16 },
  {
    id: "seed-hot-cold-1",
    name: "マサト",
    roles: ["hot", "cold"],
    minShiftLength: 8,
    maxShiftLength: 16,
  },
  {
    id: "seed-dish-1",
    name: "レイ",
    roles: ["dishwashing"],
    minShiftLength: 8,
    maxShiftLength: 16,
  },
  {
    id: "seed-hall-dish-1",
    name: "ジュン",
    roles: ["hall", "dishwashing"],
    minShiftLength: 8,
    maxShiftLength: 16,
  },
];

// ランチ帯（12:00-14:00）とディナー帯（19:00-23:00）を「ピーク」として厚くし、
// 開店直後・閉店間際（仕込み・後片付け）を薄くする。
const LUNCH_PEAK: readonly [number, number] = [4, 8]; // 12:00-14:00
const DINNER_PEAK: readonly [number, number] = [18, 26]; // 19:00-23:00
const PREP_AND_CLOSING: readonly [number, number][] = [
  [0, 4], // 10:00-12:00 仕込み
  [26, SLOT_COUNT], // 23:00-24:00 後片付け
];

function inRange(slot: number, [start, end]: readonly [number, number]): boolean {
  return slot >= start && slot < end;
}

function isPeak(slot: number): boolean {
  return inRange(slot, LUNCH_PEAK) || inRange(slot, DINNER_PEAK);
}

function isPrepOrClosing(slot: number): boolean {
  return PREP_AND_CLOSING.some((range) => inRange(slot, range));
}

/** 標準的なコマの必要人数。ピーク帯は2人、仕込み・後片付けは1人、それ以外も1人。 */
function standardHeadcount(slot: number): number {
  return isPeak(slot) ? 2 : 1;
}

/** 洗い場は営業中だけ必要で、仕込み・後片付けの帯は0人でよい。 */
function dishwashingHeadcount(slot: number): number {
  return isPrepOrClosing(slot) ? 0 : 1;
}

function buildRequirements(): readonly SlotRequirements[] {
  return Array.from({ length: SLOT_COUNT }, (_, slot) => ({
    hall: standardHeadcount(slot),
    hot: standardHeadcount(slot),
    cold: standardHeadcount(slot),
    dishwashing: dishwashingHeadcount(slot),
  }));
}

type AvailabilityWindow = Readonly<{ start: number; end: number }>;

/**
 * 各従業員の当日の出勤可能時間帯。役割に応じた典型的な勤務帯を割り当てる。
 * 3日とも同じ内訳ではなく、`offEmployeeId` で指定した従業員はその日だけ休みにする
 * （出勤可能時間帯を持たせない）ことで、「未入力はその日の休み」という規則が
 * 実際に意味を持つ入力にしている。
 */
function buildAvailability(offEmployeeId?: string): DayAvailability {
  const windows: Record<string, AvailabilityWindow> = {
    "seed-hall-1": { start: 0, end: 16 }, // 10:00-18:00
    "seed-hall-2": { start: 8, end: SLOT_COUNT }, // 14:00-24:00
    "seed-hot-1": { start: 0, end: 16 }, // 10:00-18:00
    "seed-hot-2": { start: 8, end: SLOT_COUNT }, // 14:00-24:00
    "seed-cold-1": { start: 0, end: 20 }, // 10:00-20:00
    "seed-hot-cold-1": { start: 4, end: SLOT_COUNT }, // 12:00-24:00
    "seed-dish-1": { start: 4, end: SLOT_COUNT }, // 12:00-24:00
    "seed-hall-dish-1": { start: 0, end: 20 }, // 10:00-20:00
  };

  const availability: Record<string, AvailabilityWindow> = {};
  for (const employee of SEED_EMPLOYEES) {
    if (employee.id === offEmployeeId) {
      continue;
    }
    availability[employee.id] = windows[employee.id];
  }
  return availability;
}

export type SeedDay = Readonly<{
  date: string;
  requirements: readonly SlotRequirements[];
  availability: DayAvailability;
}>;

export const SEED_DAYS: readonly SeedDay[] = [
  { date: "2026-09-08", requirements: buildRequirements(), availability: buildAvailability() },
  {
    date: "2026-09-09",
    requirements: buildRequirements(),
    availability: buildAvailability("seed-hot-cold-1"),
  },
  {
    date: "2026-09-10",
    requirements: buildRequirements(),
    availability: buildAvailability("seed-hall-dish-1"),
  },
];
