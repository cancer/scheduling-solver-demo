// シフト管理ドメインの共通の型・定数。
//
// もとは `src/poc/types.ts` にあった。D1 スキーマ（工程2）と PoC の求解ロジック
// （`src/poc/patterns.ts` / `src/poc/lp.ts` / `src/poc/fixture.ts`）の両方が同じ
// 役割集合・コマ数を必要とするため、共有先としてここへ移した。定数を2箇所に
// 置くと乖離するので、ここを唯一の定義箇所とする。
//
// 営業時間 10:00〜24:00、30分コマで28コマ（要件書「画面や操作がなくても成立する
// 業務規則を定める」）。

export const SLOT_COUNT = 28;
export const MIN_SHIFT_LENGTH = 8;
export const MAX_SHIFT_LENGTH = 16;

export const ROLES = ["hall", "hot", "cold", "dishwashing"] as const;
export type Role = (typeof ROLES)[number];

/**
 * 値が ROLES の要素かどうかを判定する。D1 から読み込んだ JSON（`JSON.parse` の戻り値は
 * `unknown`/`any` で型システムの外にある）の中身を検証する箇所（`src/lib/server/db/`）で
 * 共通して使う。ここを唯一の定義にすることで、テーブルごとに検証がずれるのを防ぐ。
 */
export function isRole(value: unknown): value is Role {
  return (ROLES as readonly unknown[]).includes(value);
}

/** 従業員の当日の出勤可能時間帯（1区間）。未入力はその日の休みとして扱う。 */
export type Availability = Readonly<{
  start: number;
  end: number;
}>;

/** 日付をまたいで共有する従業員データ。 */
export type Employee = Readonly<{
  id: string;
  name: string;
  roles: readonly Role[];
  availability?: Availability;
  minShiftLength: number;
  maxShiftLength: number;
}>;

/** コマ × 役割ごとの必要人数。 */
export type SlotRequirements = Readonly<Record<Role, number>>;
