import { ValidationError } from "./errors";

// 契約「`date` は `YYYY-MM-DD`。不正なら 400」の検証。形式だけでなく、
// 実在しない日付（例: 2026-02-30）も拒否する（`Date` に一度変換し、
// ISO 表記に戻して元の文字列と一致するかで確かめる）。
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateParam(value: string | undefined): string {
  if (value === undefined || !DATE_PATTERN.test(value) || !isRealDate(value)) {
    throw new ValidationError(`date は YYYY-MM-DD 形式でなければならない: ${String(value)}`);
  }
  return value;
}

function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
