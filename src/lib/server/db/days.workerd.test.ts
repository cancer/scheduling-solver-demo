import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import { SLOT_COUNT } from "../../domain/shift";
import type { Role, SlotRequirements } from "../../domain/shift";
import type { DayData } from "../../domain/day";
import { createDay, getDay, saveDay } from "./days";

function zeroRequirements(): readonly SlotRequirements[] {
  return Array.from({ length: SLOT_COUNT }, () => ({ hall: 0, hot: 0, cold: 0, dishwashing: 0 }));
}

describe("shift_days repository (実 D1 / workerd)", () => {
  it("returns nothing for a date that has not been created", async () => {
    expect(await getDay(env.DB, "2026-09-08")).toBeNull();
  });

  it("creates a new date with empty data, not a template copied from elsewhere", async () => {
    await createDay(env.DB, "2026-09-09");

    const day = await getDay(env.DB, "2026-09-09");
    expect(day).toEqual({
      requirements: zeroRequirements(),
      availability: {},
      pinnedAssignments: [],
      solution: null,
    });
  });

  it("keeps one date's edits from touching another date's data", async () => {
    await createDay(env.DB, "2026-09-10");
    await createDay(env.DB, "2026-09-11");

    const requirementsForTenth = zeroRequirements().map((slot, index) =>
      index === 5
        ? { hall: 2, hot: slot.hot, cold: slot.cold, dishwashing: slot.dishwashing }
        : slot,
    );
    await saveDay(env.DB, "2026-09-10", {
      requirements: requirementsForTenth,
      availability: { alice: { start: 0, end: 10 } },
      pinnedAssignments: [{ employeeId: "alice", role: "hall", start: 0, length: 8 }],
      solution: {
        status: "optimal",
        objectiveValue: 8,
        assignments: [{ employeeId: "alice", role: "hall", start: 0, length: 8 }],
        shortages: [],
      },
    });

    const untouched = await getDay(env.DB, "2026-09-11");
    expect(untouched).toEqual({
      requirements: zeroRequirements(),
      availability: {},
      pinnedAssignments: [],
      solution: null,
    });

    const changed = await getDay(env.DB, "2026-09-10");
    expect(changed?.requirements[5].hall).toBe(2);
    expect(changed?.availability).toEqual({ alice: { start: 0, end: 10 } });
    expect(changed?.solution?.status).toBe("optimal");
  });

  it("rejects a requirements array whose length is not SLOT_COUNT", async () => {
    await createDay(env.DB, "2026-09-13");

    await expect(
      saveDay(env.DB, "2026-09-13", {
        requirements: zeroRequirements().slice(0, SLOT_COUNT - 1),
        availability: {},
        pinnedAssignments: [],
        solution: null,
      }),
    ).rejects.toThrow(`requirements は ${SLOT_COUNT} コマ分でなければならない`);
  });

  it("rejects an assignment (pinned or solved) whose role is not one of ROLES", async () => {
    await createDay(env.DB, "2026-09-14");

    await expect(
      saveDay(env.DB, "2026-09-14", {
        requirements: zeroRequirements(),
        availability: {},
        pinnedAssignments: [
          { employeeId: "alice", role: "unknown-role" as unknown as Role, start: 0, length: 8 },
        ],
        solution: null,
      }),
    ).rejects.toThrow("未知の role");
  });

  it("does not recreate an existing date's data (idempotent create)", async () => {
    await createDay(env.DB, "2026-09-12");
    const saved = {
      requirements: zeroRequirements().map((slot, index) =>
        index === 0 ? { hall: 1, hot: 0, cold: 0, dishwashing: 0 } : slot,
      ),
      availability: { bob: { start: 4, end: 20 } },
      pinnedAssignments: [{ employeeId: "bob", role: "hall", start: 4, length: 8 }],
      solution: {
        status: "optimal",
        objectiveValue: 8,
        assignments: [{ employeeId: "bob", role: "hall", start: 4, length: 8 }],
        shortages: [],
      },
    } as const satisfies DayData;
    await saveDay(env.DB, "2026-09-12", saved);

    await createDay(env.DB, "2026-09-12");

    // `INSERT OR IGNORE` が他のカラムを巻き添えで上書きする実装に変わっても検出できるよう、
    // availability だけでなく DayData 全体を固定する。
    const day = await getDay(env.DB, "2026-09-12");
    expect(day).toEqual(saved);
  });

  describe("読み込み時の検証（employees.ts の parseRoles と同じ境界を JSON.parse の戻り値に置く）", () => {
    async function insertRawRow(date: string, columnName: string, rawJson: string): Promise<void> {
      const columns: Record<string, string> = {
        requirements_json: JSON.stringify(zeroRequirements()),
        availability_json: "{}",
        pinned_assignments_json: "[]",
      };
      columns[columnName] = rawJson;
      await env.DB.prepare(
        "INSERT INTO shift_days (date, requirements_json, availability_json, pinned_assignments_json, solution_json) VALUES (?, ?, ?, ?, NULL)",
      )
        .bind(
          date,
          columns.requirements_json,
          columns.availability_json,
          columns.pinned_assignments_json,
        )
        .run();
    }

    it("rejects requirements_json whose length or shape does not match SLOT_COUNT slots of SlotRequirements", async () => {
      await insertRawRow("2026-09-15", "requirements_json", JSON.stringify([{ hall: 1 }]));

      await expect(getDay(env.DB, "2026-09-15")).rejects.toThrow("requirements_json");
    });

    it("rejects availability_json whose values are not {start, end} windows", async () => {
      await insertRawRow(
        "2026-09-16",
        "availability_json",
        JSON.stringify({ alice: { start: "0", end: 10 } }),
      );

      await expect(getDay(env.DB, "2026-09-16")).rejects.toThrow("availability_json");
    });

    it("rejects pinned_assignments_json whose role is not one of ROLES", async () => {
      await insertRawRow(
        "2026-09-17",
        "pinned_assignments_json",
        JSON.stringify([{ employeeId: "alice", role: "unknown-role", start: 0, length: 8 }]),
      );

      await expect(getDay(env.DB, "2026-09-17")).rejects.toThrow("pinned_assignments_json");
    });

    it("rejects a solution_json whose assignments or shortages are malformed", async () => {
      await env.DB.prepare(
        "INSERT INTO shift_days (date, requirements_json, availability_json, pinned_assignments_json, solution_json) VALUES (?, ?, ?, ?, ?)",
      )
        .bind(
          "2026-09-18",
          JSON.stringify(zeroRequirements()),
          "{}",
          "[]",
          JSON.stringify({
            status: "optimal",
            objectiveValue: 0,
            assignments: [],
            shortages: [{ slot: 0 }],
          }),
        )
        .run();

      await expect(getDay(env.DB, "2026-09-18")).rejects.toThrow("solution_json");
    });

    it("rejects a solution_json shortage whose amount is not a number", async () => {
      await env.DB.prepare(
        "INSERT INTO shift_days (date, requirements_json, availability_json, pinned_assignments_json, solution_json) VALUES (?, ?, ?, ?, ?)",
      )
        .bind(
          "2026-09-19",
          JSON.stringify(zeroRequirements()),
          "{}",
          "[]",
          JSON.stringify({
            status: "optimal",
            objectiveValue: 0,
            assignments: [],
            shortages: [{ slot: 0, role: "hall", amount: "1" }],
          }),
        )
        .run();

      await expect(getDay(env.DB, "2026-09-19")).rejects.toThrow("solution_json");
    });
  });
});
