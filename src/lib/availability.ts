import type { DayAvailability } from "./domain/day";

// 従業員ごとの出勤可能時間帯入力の画面が使う純関数。「未入力はその日の休み」
// （`src/lib/domain/day.ts` の `DayAvailability` のコメント）という規則に従い、
// 休みは値の削除で表す（`null` を渡す）。

/** 従業員の当日の出勤可能時間帯を設定する。`window` が null ならその日を休みにする。 */
export function setEmployeeAvailability(
  availability: DayAvailability,
  employeeId: string,
  window: Readonly<{ start: number; end: number }> | null,
): DayAvailability {
  const next = { ...availability };
  if (window === null) {
    delete next[employeeId];
    return next;
  }
  next[employeeId] = window;
  return next;
}

/** 従業員がその日休みかどうか（出勤可能時間帯が未入力かどうか）。 */
export function isOff(availability: DayAvailability, employeeId: string): boolean {
  return availability[employeeId] === undefined;
}
