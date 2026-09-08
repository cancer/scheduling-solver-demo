import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import { SLOT_COUNT } from "../../domain/shift";
import type { SlotRequirements } from "../../domain/shift";
import { createDay, getDay, saveDay } from "./days";
import { listEmployees, replaceAllEmployees } from "./employees";

// plan の検証手段「共有従業員1件と異なる2日分の入力を作成し、読み書きの往復をテストする」
// に対応する。`employees.ts`（employees テーブル）と `days.ts`（shift_days テーブル）は
// コード上は互いに触らない独立したモジュールだが、実際の画面操作は両方を同じ流れで使う
// （従業員は一度登録すれば複数日で共有し、日付ごとに別々の入力を持つ）。この使い方を
// 1つのテストで固定する。

function zeroRequirements(): readonly SlotRequirements[] {
  return Array.from({ length: SLOT_COUNT }, () => ({ hall: 0, hot: 0, cold: 0, dishwashing: 0 }));
}

describe("共有従業員1件 + 異なる2日分の入力の読み書き往復（実 D1 / workerd）", () => {
  it("keeps the shared employee and each date's own data intact through a save/read round trip", async () => {
    const sharedEmployee = {
      id: "shared-1",
      name: "共有太郎",
      roles: ["hall", "hot"] as const,
      minShiftLength: 8,
      maxShiftLength: 16,
    };
    await replaceAllEmployees(env.DB, [sharedEmployee]);

    await createDay(env.DB, "2026-10-01");
    await createDay(env.DB, "2026-10-02");

    const dayOne = {
      requirements: zeroRequirements().map((slot, index) =>
        index === 0 ? { hall: 1, hot: 0, cold: 0, dishwashing: 0 } : slot,
      ),
      availability: { "shared-1": { start: 0, end: 12 } },
      pinnedAssignments: [{ employeeId: "shared-1", role: "hall" as const, start: 0, length: 8 }],
      solution: null,
    };
    const dayTwo = {
      requirements: zeroRequirements().map((slot, index) =>
        index === 20 ? { hall: 0, hot: 2, cold: 0, dishwashing: 0 } : slot,
      ),
      availability: { "shared-1": { start: 12, end: SLOT_COUNT } },
      pinnedAssignments: [],
      solution: {
        status: "optimal",
        objectiveValue: 8,
        assignments: [{ employeeId: "shared-1", role: "hot" as const, start: 20, length: 8 }],
        shortages: [],
      },
    };

    await saveDay(env.DB, "2026-10-01", dayOne);
    await saveDay(env.DB, "2026-10-02", dayTwo);

    const employees = await listEmployees(env.DB);
    expect(employees).toEqual([sharedEmployee]);

    expect(await getDay(env.DB, "2026-10-01")).toEqual(dayOne);
    expect(await getDay(env.DB, "2026-10-02")).toEqual(dayTwo);
  });
});
