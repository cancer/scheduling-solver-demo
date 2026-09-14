import type { Role, SlotRequirements } from "./domain/shift";

// 必要人数ヒートマップ（決定17）が使う純関数群。`.svelte` にロジックを書かず
// ここへ寄せる（決定5）。UI はこれらの値・関数を並べて表示・配線するだけにする。

const OPENING_HOUR = 10;
const SLOT_MINUTES = 30;

/** コマ番号から開始時刻の "HH:MM" 表記を作る（コマ0 = 10:00）。 */
export function slotStartLabel(slot: number): string {
  const totalMinutes = OPENING_HOUR * 60 + slot * SLOT_MINUTES;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** 30分コマの時刻見出しを、1時間ごとに表示するための判定。 */
export function isHourlySlot(slot: number): boolean {
  return (slot * SLOT_MINUTES) % 60 === 0;
}

const ROLE_LABELS: Readonly<Record<Role, string>> = {
  hall: "ホール",
  hot: "ホット",
  cold: "コールド",
  dishwashing: "洗い場",
};

/** 役割の日本語表示名。 */
export function roleLabel(role: Role): string {
  return ROLE_LABELS[role];
}

/** ヒートマップのセルに付ける読み上げ用ラベル（役割・時刻・人数）。 */
export function cellAriaLabel(role: Role, slot: number, count: number): string {
  return `${roleLabel(role)} ${slotStartLabel(slot)} 必要人数${count}人`;
}

const MIN_COUNT = 0;
const MAX_COUNT = 99;

function clampCount(count: number): number {
  return Math.min(MAX_COUNT, Math.max(MIN_COUNT, count));
}

/** キーボード操作で人数を増減する（0未満・99超にはならない）。 */
export function adjustCount(current: number, delta: number): number {
  return clampCount(current + delta);
}

/**
 * 人数を、DESIGN.md が段階 variant として定義したセルの level（`0`〜`maxLevel`）へ写す。
 * 色そのものはここで決めない。色は `heat-cell-level-<n>-*` / `shortage-cell-level-<n>-*`
 * トークンが持ち、この関数はどの段を引くかだけを返す（生の色を直書きしないため）。
 * `maxLevel` 以上は同じ段に飽和するので、色だけでは飽和点より上を区別できない
 * （決定17の代償）。セル側で数値を必ず併記する前提の関数。
 */
export function heatLevel(count: number, maxLevel: number): number {
  return Math.min(maxLevel, Math.max(MIN_COUNT, count));
}

/** 指定したコマ・役割の必要人数だけを更新した新しい配列を返す（不変更新）。 */
export function setRequirement(
  requirements: readonly SlotRequirements[],
  role: Role,
  slot: number,
  count: number,
): readonly SlotRequirements[] {
  return requirements.map((requirement, index) =>
    index === slot ? { ...requirement, [role]: clampCount(count) } : requirement,
  );
}
