import { describe, expect, it } from "vitest";

import type { Employee } from "../domain/shift";
import { SEED_DAYS, SEED_EMPLOYEES } from "./db/seed";
import { getScheduleSolver } from "./solver";

// 製品 Worker で実際に HiGHS の wasm ビルドを読み込み、求解できることを確かめる
// （工程3の指示「製品 Worker でソルバーを動かす」）。`wrangler.test.jsonc` に
// `CompiledWasm` の rule を足したことで、`workerd` 上でも `.wasm` を
// `WebAssembly.Module` として import できる。

function totalShortage(shortages: readonly { amount: number }[]): number {
  return shortages.reduce((sum, shortage) => sum + shortage.amount, 0);
}

function withAvailability(
  employee: (typeof SEED_EMPLOYEES)[number],
  availability: { start: number; end: number },
): Employee {
  return {
    id: employee.id,
    name: employee.name,
    roles: employee.roles,
    minShiftLength: employee.minShiftLength,
    maxShiftLength: employee.maxShiftLength,
    availability,
  };
}

describe("getScheduleSolver (実 wasm / workerd)", () => {
  it("solves a small one-employee input optimally with the real HiGHS wasm build", async () => {
    const employees: readonly Employee[] = [
      {
        id: "a",
        name: "A",
        roles: ["hall"],
        availability: { start: 0, end: 8 },
        minShiftLength: 8,
        maxShiftLength: 8,
      },
    ];
    const requirements = Array.from({ length: 28 }, (_, slot) => ({
      hall: slot < 8 ? 1 : 0,
      hot: 0,
      cold: 0,
      dishwashing: 0,
    }));

    const solution = await getScheduleSolver().solve({
      employees,
      requirements,
      pinnedAssignments: [],
    });

    expect(solution.status).toBe("Optimal");
    expect(solution.assignments).toEqual([{ employeeId: "a", role: "hall", start: 0, length: 8 }]);
    expect(totalShortage(solution.shortages)).toBe(0);
  });

  it("fixes a pinned assignment's variable when solving with the real HiGHS wasm build", async () => {
    const employees: readonly Employee[] = [
      {
        id: "a",
        name: "A",
        roles: ["hall"],
        availability: { start: 0, end: 16 },
        minShiftLength: 8,
        maxShiftLength: 8,
      },
    ];
    const requirements = Array.from({ length: 28 }, () => ({
      hall: 0,
      hot: 0,
      cold: 0,
      dishwashing: 0,
    }));

    const solution = await getScheduleSolver().solve({
      employees,
      requirements,
      pinnedAssignments: [{ employeeId: "a", role: "hall", start: 8, length: 8 }],
    });

    // 需要が全コマ0でも、ピン留めした割当は固定されて解に残る。
    expect(solution.status).toBe("Optimal");
    expect(solution.assignments).toEqual([{ employeeId: "a", role: "hall", start: 8, length: 8 }]);
  });

  // 工程3の指示「seed の3日分を実際に求解し、不足の量を報告する」。需要は延べ142人コマ/日、
  // 供給の理論上限は従業員8人 × 勤務長さ上限16コマ=128人コマ/日で、これだけでも構造的に
  // 供給が不足する。実際の出勤可能時間帯（`seed.ts` の `buildAvailability`）はさらに
  // 短いため、実測の不足はこれより大きくなる。値は本テストを実行して得た結果を固定した
  // （3日とも不足ゼロにも全日大幅な不足にもならないため、seed の調整は行っていない）。
  const seedShortageByDate: Readonly<Record<string, number>> = {
    "2026-09-08": 36,
    "2026-09-09": 48,
    "2026-09-10": 42,
  };

  it.each(
    SEED_DAYS.map((day) => ({
      date: day.date,
      requirements: day.requirements,
      availability: day.availability,
    })),
  )(
    "solves seed day $date with the fixed shortage headcount",
    async ({ date, requirements, availability }) => {
      const employees: readonly Employee[] = SEED_EMPLOYEES.filter(
        (employee) => availability[employee.id] !== undefined,
      ).map((employee) => withAvailability(employee, availability[employee.id]));

      const solution = await getScheduleSolver().solve({
        employees,
        requirements,
        pinnedAssignments: [],
      });

      expect(solution.status).toBe("Optimal");
      expect(totalShortage(solution.shortages)).toBe(seedShortageByDate[date]);
    },
  );
});
