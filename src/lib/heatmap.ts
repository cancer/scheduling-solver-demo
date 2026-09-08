import { SLOT_COUNT } from "./domain/shift";
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

const HEAT_HUE = 210; // 単一色相（青系）の順次スケール。役割ごとの色分けはしない。
const ZERO_LIGHTNESS = 96;
const MIN_LIGHTNESS = 38;

/**
 * 必要人数を単一色相の順次スケール（淡い→濃い）へ写す。5人以上を色だけで
 * 区別しない（決定17の代償）ため、色はあくまで大小の目安であり、セル側で
 * 数値を必ず併記する前提の関数。`scaleMax` 以上は同じ色に飽和させる。
 */
export function heatColor(count: number, scaleMax: number): string {
  if (count <= MIN_COUNT) {
    return `hsl(${HEAT_HUE} 20% ${ZERO_LIGHTNESS}%)`;
  }
  const ratio = Math.min(1, count / scaleMax);
  const lightness = ZERO_LIGHTNESS - ratio * (ZERO_LIGHTNESS - MIN_LIGHTNESS);
  return `hsl(${HEAT_HUE} 70% ${lightness}%)`;
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

/** 空（すべて0）の必要人数配列を作る。新しい日付の初期状態に使う。 */
export function emptyRequirements(): readonly SlotRequirements[] {
  return Array.from({ length: SLOT_COUNT }, () => ({
    hall: 0,
    hot: 0,
    cold: 0,
    dishwashing: 0,
  }));
}
