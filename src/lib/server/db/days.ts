import { ROLES, SLOT_COUNT } from "../../domain/shift";
import type { SlotRequirements } from "../../domain/shift";
import type { DayAvailability, DayData, StoredAssignment, StoredSolution } from "../../domain/day";

// D1 の `shift_days` テーブル（日付に属するデータ）への読み書き。物理設計・
// カラムの意味は `migrations/0001_init.sql` のコメントを参照。

type DayRow = {
  date: string;
  requirements_json: string;
  availability_json: string;
  pinned_assignments_json: string;
  solution_json: string | null;
};

function emptyRequirements(): readonly SlotRequirements[] {
  return Array.from({ length: SLOT_COUNT }, () => ({ hall: 0, hot: 0, cold: 0, dishwashing: 0 }));
}

function rowToDayData(row: DayRow): DayData {
  return {
    requirements: JSON.parse(row.requirements_json) as readonly SlotRequirements[],
    availability: JSON.parse(row.availability_json) as DayAvailability,
    pinnedAssignments: JSON.parse(row.pinned_assignments_json) as readonly StoredAssignment[],
    solution: row.solution_json === null ? null : (JSON.parse(row.solution_json) as StoredSolution),
  };
}

/** 指定した日付のデータを返す。まだ作成されていない日付には `null` を返す。 */
export async function getDay(db: D1Database, date: string): Promise<DayData | null> {
  const row = await db
    .prepare(
      "SELECT date, requirements_json, availability_json, pinned_assignments_json, solution_json FROM shift_days WHERE date = ?",
    )
    .bind(date)
    .first<DayRow>();
  return row === null ? null : rowToDayData(row);
}

/**
 * 新しい日付を空データで作成する。テンプレートは適用しない
 * （必要人数は全コマ・全役割0、出勤可能時間帯・固定割当は空、求解結果は未求解）。
 * 既に存在する日付に対しては何もしない（べき等）。
 */
export async function createDay(db: D1Database, date: string): Promise<void> {
  await db
    .prepare(
      "INSERT OR IGNORE INTO shift_days (date, requirements_json, availability_json, pinned_assignments_json, solution_json) VALUES (?, ?, ?, ?, NULL)",
    )
    .bind(date, JSON.stringify(emptyRequirements()), JSON.stringify({}), JSON.stringify([]))
    .run();
}

/** 指定した日付のデータを丸ごと置き換える。対象の日付は事前に作成されている前提とする。 */
export async function saveDay(db: D1Database, date: string, data: DayData): Promise<void> {
  if (data.requirements.length !== SLOT_COUNT) {
    throw new Error(`requirements は ${SLOT_COUNT} コマ分でなければならない`);
  }
  for (const assignment of [...data.pinnedAssignments, ...(data.solution?.assignments ?? [])]) {
    if (!(ROLES as readonly string[]).includes(assignment.role)) {
      throw new Error(`未知の role: ${assignment.role}`);
    }
  }

  await db
    .prepare(
      "UPDATE shift_days SET requirements_json = ?, availability_json = ?, pinned_assignments_json = ?, solution_json = ? WHERE date = ?",
    )
    .bind(
      JSON.stringify(data.requirements),
      JSON.stringify(data.availability),
      JSON.stringify(data.pinnedAssignments),
      data.solution === null ? null : JSON.stringify(data.solution),
      date,
    )
    .run();
}
