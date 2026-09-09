import { ValidationError } from "./errors";

// リクエスト body の形状検証で共通して使う小さな型ガード。`as` で型システムを
// 迂回せず、実行時に確かめてから型を絞り込む（契約「`as` で通さず検証する」）。
//
// `isRole` は `$lib/domain/shift` の定義（唯一の定義）を re-export している。
export { isRole } from "../../domain/shift";

export function expectObject(value: unknown, label: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ValidationError(`${label} はオブジェクトでなければならない`);
  }
  return value as Record<string, unknown>;
}

export function expectArray(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) {
    throw new ValidationError(`${label} は配列でなければならない`);
  }
  return value;
}

export function expectString(value: unknown, label: string): string {
  if (typeof value !== "string") {
    throw new ValidationError(`${label} は文字列でなければならない`);
  }
  return value;
}

export function expectFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new ValidationError(`${label} は数値でなければならない`);
  }
  return value;
}
