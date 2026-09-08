import { ROLES } from "../../domain/shift";
import type { Employee, Role } from "../../domain/shift";

// D1 の `employees` テーブル（日付をまたいで共有する従業員データ）への読み書き。
// `roles` は物理設計として `roles_json`（JSON配列のTEXT）に保存している。理由は
// `migrations/0001_init.sql` のコメントを参照。
//
// `Employee`（`$lib/domain/shift`）は `availability?` を持つが、それは `src/poc` が
// 単日の求解ハーネス用に1つの型へまとめているだけであり、出勤可能時間帯は
// 「日付に属する」データである（要件書「日付と従業員のデータ所有範囲を定める」）。
// この層が扱う「共有する従業員データ」には含めないため、`availability` を除いた
// `StoredEmployee` を使う。
export type StoredEmployee = Omit<Employee, "availability">;

type EmployeeRow = {
  id: string;
  name: string;
  roles_json: string;
  min_shift_length: number;
  max_shift_length: number;
};

function isRole(value: unknown): value is Role {
  return (ROLES as readonly unknown[]).includes(value);
}

function parseRoles(rolesJson: string): readonly Role[] {
  const parsed: unknown = JSON.parse(rolesJson);
  if (!Array.isArray(parsed) || !parsed.every(isRole)) {
    throw new Error(`employees.roles_json に想定外の値が入っている: ${rolesJson}`);
  }
  return parsed;
}

function rowToEmployee(row: EmployeeRow): StoredEmployee {
  return {
    id: row.id,
    name: row.name,
    roles: parseRoles(row.roles_json),
    minShiftLength: row.min_shift_length,
    maxShiftLength: row.max_shift_length,
  };
}

/** 従業員を id 昇順で全件返す。 */
export async function listEmployees(db: D1Database): Promise<readonly StoredEmployee[]> {
  const { results } = await db
    .prepare(
      "SELECT id, name, roles_json, min_shift_length, max_shift_length FROM employees ORDER BY id",
    )
    .all<EmployeeRow>();
  return results.map(rowToEmployee);
}

/** 既存の全従業員を削除し、渡した集合で置き換える（1つのバッチでアトミックに行う）。 */
export async function replaceAllEmployees(
  db: D1Database,
  employees: readonly StoredEmployee[],
): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM employees"),
    ...employees.map((employee) =>
      db
        .prepare(
          "INSERT INTO employees (id, name, roles_json, min_shift_length, max_shift_length) VALUES (?, ?, ?, ?, ?)",
        )
        .bind(
          employee.id,
          employee.name,
          JSON.stringify(employee.roles),
          employee.minShiftLength,
          employee.maxShiftLength,
        ),
    ),
  ]);
}
