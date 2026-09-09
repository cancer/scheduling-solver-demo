import { SLOT_COUNT } from "./domain/shift";
import type { Role, SlotRequirements } from "./domain/shift";
import type { StoredShortage } from "./domain/day";
import type { StoredAssignment } from "./domain/day";
import { roleLabel, slotStartLabel } from "./heatmap";

// 求解結果の画面表示（シフト表・不足人数）が使う純関数。`.svelte` はこれらを
// 呼んで結果を表示するだけにする（決定5）。

/** 勤務バーの読み上げ・表示用ラベル（従業員名・役割・開始-終了時刻）。 */
export function assignmentLabel(
  employeeName: string,
  role: Role,
  start: number,
  length: number,
): string {
  return `${employeeName} ${roleLabel(role)} ${slotStartLabel(start)}-${slotStartLabel(start + length)}`;
}

/** 不足表示セルの読み上げ用ラベル（役割・時刻・不足人数）。 */
export function shortageAriaLabel(role: Role, slot: number, amount: number): string {
  return `${roleLabel(role)} ${slotStartLabel(slot)} 不足${amount}人`;
}

export type AssignmentBarPosition = Readonly<{
  columnStart: number;
  columnSpan: number;
}>;

/** 勤務割当を28コマのCSSグリッド上の開始列と幅へ変換する。 */
export function assignmentBarPosition(
  assignment: Pick<StoredAssignment, "start" | "length">,
): AssignmentBarPosition {
  return {
    columnStart: assignment.start + 1,
    columnSpan: assignment.length,
  };
}

/** 勤務バーの位置を CSS グリッド指定へ変換する。 */
export function assignmentBarStyle(assignment: Pick<StoredAssignment, "start" | "length">): string {
  const position = assignmentBarPosition(assignment);
  return `grid-column: ${position.columnStart} / span ${position.columnSpan};`;
}

/** ソルバーが返す不足リストを、必要人数と同じ形（コマ×役割）へ整形する。 */
export function buildShortageGrid(
  shortages: readonly StoredShortage[],
): readonly SlotRequirements[] {
  const grid: SlotRequirements[] = Array.from({ length: SLOT_COUNT }, () => ({
    hall: 0,
    hot: 0,
    cold: 0,
    dishwashing: 0,
  }));
  for (const shortage of shortages) {
    grid[shortage.slot] = { ...grid[shortage.slot], [shortage.role]: shortage.amount };
  }
  return grid;
}
