import { SLOT_COUNT } from "./domain/shift";
import type { Role } from "./domain/shift";
import type { StoredEmployee } from "./api/types";

// 従業員管理（一覧・追加・編集・削除）の画面が使う純関数。`.svelte` はこれらを
// 呼んで結果を表示するだけにする（決定5）。

/** 新しい従業員を末尾に追加した新しい配列を返す。 */
export function addEmployee(
  employees: readonly StoredEmployee[],
  employee: StoredEmployee,
): readonly StoredEmployee[] {
  return [...employees, employee];
}

/** 指定した id の従業員に patch をマージした新しい配列を返す。 */
export function updateEmployee(
  employees: readonly StoredEmployee[],
  id: string,
  patch: Partial<Omit<StoredEmployee, "id">>,
): readonly StoredEmployee[] {
  return employees.map((employee) => (employee.id === id ? { ...employee, ...patch } : employee));
}

/** 指定した id の従業員を除いた新しい配列を返す。 */
export function removeEmployee(
  employees: readonly StoredEmployee[],
  id: string,
): readonly StoredEmployee[] {
  return employees.filter((employee) => employee.id !== id);
}

/** 役割集合に対する追加・削除の切り替え（チェックボックスの配線が使う）。 */
export function toggleRole(roles: readonly Role[], role: Role): readonly Role[] {
  return roles.includes(role) ? roles.filter((r) => r !== role) : [...roles, role];
}

/** 保存されている30分コマ数を、画面で表示する時間へ変換する。 */
export function shiftLengthToHours(length: number): number {
  return length / 2;
}

/** 画面の時間入力を30分コマ数へ変換する。不正な入力は null を返す。 */
export function hoursToShiftLength(hours: number): number | null {
  if (
    !Number.isFinite(hours) ||
    hours < 0.5 ||
    hours > SLOT_COUNT / 2 ||
    !Number.isInteger(hours * 2)
  ) {
    return null;
  }
  return hours * 2;
}

/** 勤務長さの下限・上限が30分コマ数として有効かを判定する。 */
export function isValidShiftLengthRange(minLength: number, maxLength: number): boolean {
  return (
    Number.isInteger(minLength) &&
    Number.isInteger(maxLength) &&
    minLength >= 1 &&
    maxLength <= SLOT_COUNT &&
    minLength <= maxLength
  );
}
