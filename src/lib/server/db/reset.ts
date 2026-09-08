import { SEED_DAYS, SEED_EMPLOYEES } from "./seed";

// すべてのデータを初期状態（seed）へ戻す。投入元は `./seed` の1箇所である（決定9）。
// `employees` と `shift_days` の両方を DELETE してから seed の内容を INSERT するため、
// 実行前の状態に関わらず（工程4で増える予定の従業員や日付を含めて）常に同じ状態へ
// 戻る（冪等）。1つの `db.batch()` でアトミックに行うため、途中で失敗して
// 中途半端な状態が残ることもない。
//
// 初期化後は求解結果・固定割当を含まない（決定10）。`shift_days` へ入れる行は
// `pinned_assignments_json = '[]'` / `solution_json = NULL` で固定しており、
// 求解結果を投入する経路自体が無い。
export async function resetToSeed(db: D1Database): Promise<void> {
  const statements = [
    db.prepare("DELETE FROM shift_days"),
    db.prepare("DELETE FROM employees"),
    ...SEED_EMPLOYEES.map((employee) =>
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
    ...SEED_DAYS.map((day) =>
      db
        .prepare(
          "INSERT INTO shift_days (date, requirements_json, availability_json, pinned_assignments_json, solution_json) VALUES (?, ?, ?, '[]', NULL)",
        )
        .bind(day.date, JSON.stringify(day.requirements), JSON.stringify(day.availability)),
    ),
  ];

  await db.batch(statements);
}
