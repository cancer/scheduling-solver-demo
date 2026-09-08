import { emptyRequirements, isRole, ROLES, SLOT_COUNT } from "../../domain/shift";
import type { SlotRequirements } from "../../domain/shift";
import type {
  DayAvailability,
  DayData,
  StoredAssignment,
  StoredShortage,
  StoredSolution,
} from "../../domain/day";

// D1 の `shift_days` テーブル（日付に属するデータ）への読み書き。物理設計・
// カラムの意味は `migrations/0001_init.sql` のコメントを参照。
//
// `requirements_json` / `availability_json` / `pinned_assignments_json` / `solution_json`
// はいずれも `JSON.parse()` の戻り値（`any`。型システムの外）を経由するため、
// `employees.ts` の `parseRoles` と同じ境界としてここで値の形を検証する。
// `saveDay` を経由しない経路（直接 SQL・将来のマイグレーション・手動修正）で
// 壊れた値が入っていた場合に、読み込み側が気づかず返してしまわないようにする。

type DayRow = {
  date: string;
  requirements_json: string;
  availability_json: string;
  pinned_assignments_json: string;
  solution_json: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSlotRequirements(value: unknown): value is SlotRequirements {
  return isRecord(value) && ROLES.every((role) => typeof value[role] === "number");
}

function parseRequirements(requirementsJson: string): readonly SlotRequirements[] {
  const parsed: unknown = JSON.parse(requirementsJson);
  if (!Array.isArray(parsed) || parsed.length !== SLOT_COUNT || !parsed.every(isSlotRequirements)) {
    throw new Error(`shift_days.requirements_json に想定外の値が入っている: ${requirementsJson}`);
  }
  return parsed;
}

function isAvailabilityWindow(value: unknown): value is { start: number; end: number } {
  return isRecord(value) && typeof value.start === "number" && typeof value.end === "number";
}

function parseAvailability(availabilityJson: string): DayAvailability {
  const parsed: unknown = JSON.parse(availabilityJson);
  if (!isRecord(parsed) || !Object.values(parsed).every(isAvailabilityWindow)) {
    throw new Error(`shift_days.availability_json に想定外の値が入っている: ${availabilityJson}`);
  }
  return parsed as DayAvailability;
}

function isStoredAssignment(value: unknown): value is StoredAssignment {
  return (
    isRecord(value) &&
    typeof value.employeeId === "string" &&
    isRole(value.role) &&
    typeof value.start === "number" &&
    typeof value.length === "number"
  );
}

function parseAssignments(
  columnName: string,
  assignmentsJson: string,
): readonly StoredAssignment[] {
  const parsed: unknown = JSON.parse(assignmentsJson);
  if (!Array.isArray(parsed) || !parsed.every(isStoredAssignment)) {
    throw new Error(`shift_days.${columnName} に想定外の値が入っている: ${assignmentsJson}`);
  }
  return parsed;
}

function isStoredShortage(value: unknown): value is StoredShortage {
  return (
    isRecord(value) &&
    typeof value.slot === "number" &&
    isRole(value.role) &&
    typeof value.amount === "number"
  );
}

function parseSolution(solutionJson: string | null): StoredSolution | null {
  if (solutionJson === null) {
    return null;
  }
  const parsed: unknown = JSON.parse(solutionJson);
  if (
    !isRecord(parsed) ||
    typeof parsed.status !== "string" ||
    typeof parsed.objectiveValue !== "number" ||
    !Array.isArray(parsed.assignments) ||
    !parsed.assignments.every(isStoredAssignment) ||
    !Array.isArray(parsed.shortages) ||
    !parsed.shortages.every(isStoredShortage)
  ) {
    throw new Error(`shift_days.solution_json に想定外の値が入っている: ${solutionJson}`);
  }
  return parsed as StoredSolution;
}

function rowToDayData(row: DayRow): DayData {
  return {
    requirements: parseRequirements(row.requirements_json),
    availability: parseAvailability(row.availability_json),
    pinnedAssignments: parseAssignments("pinned_assignments_json", row.pinned_assignments_json),
    solution: parseSolution(row.solution_json),
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
    if (!isRole(assignment.role)) {
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
