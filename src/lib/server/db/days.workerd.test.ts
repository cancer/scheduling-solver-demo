import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import { SLOT_COUNT } from "../../domain/shift";
import type { Role, SlotRequirements } from "../../domain/shift";
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
    await saveDay(env.DB, "2026-09-12", {
      requirements: zeroRequirements(),
      availability: { bob: { start: 4, end: 20 } },
      pinnedAssignments: [],
      solution: null,
    });

    await createDay(env.DB, "2026-09-12");

    const day = await getDay(env.DB, "2026-09-12");
    expect(day?.availability).toEqual({ bob: { start: 4, end: 20 } });
  });
});
