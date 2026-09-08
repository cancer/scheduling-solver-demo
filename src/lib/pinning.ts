import type { StoredAssignment } from "./domain/day";

// 勤務バーのクリックによるピン留めの切り替え（画面の契約）が使う純関数。
// 同一性は id ではなく値（employeeId・role・start・length）で判定する。
// `StoredAssignment` はソルバー出力にも固定入力にも id を持たないため。

function sameAssignment(a: StoredAssignment, b: StoredAssignment): boolean {
  return (
    a.employeeId === b.employeeId &&
    a.role === b.role &&
    a.start === b.start &&
    a.length === b.length
  );
}

/** 指定した割当が固定済みかどうか。 */
export function isPinned(
  pinned: readonly StoredAssignment[],
  assignment: StoredAssignment,
): boolean {
  return pinned.some((candidate) => sameAssignment(candidate, assignment));
}

/** 固定・解除を切り替えた新しい配列を返す（不変更新）。 */
export function togglePinned(
  pinned: readonly StoredAssignment[],
  assignment: StoredAssignment,
): readonly StoredAssignment[] {
  if (isPinned(pinned, assignment)) {
    return pinned.filter((candidate) => !sameAssignment(candidate, assignment));
  }
  return [...pinned, assignment];
}
