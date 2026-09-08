import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import { createDay, getDay, saveDay } from "./days";
import { listEmployees, replaceAllEmployees } from "./employees";
import { resetToSeed } from "./reset";
import { SEED_DAYS, SEED_EMPLOYEES } from "./seed";

describe("resetToSeed (実 D1 / workerd)", () => {
  it("returns all data to the seed state after some of it has been edited", async () => {
    await resetToSeed(env.DB);
    await replaceAllEmployees(env.DB, []);
    await createDay(env.DB, "2099-01-01");
    const [firstSeedDay] = SEED_DAYS;
    await saveDay(env.DB, firstSeedDay.date, {
      requirements: firstSeedDay.requirements,
      availability: firstSeedDay.availability,
      pinnedAssignments: [{ employeeId: "seed-hall-1", role: "hall", start: 0, length: 8 }],
      solution: {
        status: "optimal",
        objectiveValue: 0,
        assignments: [],
        shortages: [],
      },
    });

    await resetToSeed(env.DB);

    const employees = await listEmployees(env.DB);
    expect(employees).toEqual(SEED_EMPLOYEES.toSorted((a, b) => a.id.localeCompare(b.id)));

    expect(await getDay(env.DB, "2099-01-01")).toBeNull();

    const days = await Promise.all(SEED_DAYS.map((seedDay) => getDay(env.DB, seedDay.date)));
    days.forEach((day, index) => {
      const seedDay = SEED_DAYS[index];
      expect(day).toEqual({
        requirements: seedDay.requirements,
        availability: seedDay.availability,
        pinnedAssignments: [],
        solution: null,
      });
    });
  });

  it("reaches the exact same state when run twice in a row (idempotent)", async () => {
    await resetToSeed(env.DB);
    const employeesAfterFirst = await listEmployees(env.DB);
    const daysAfterFirst = await Promise.all(SEED_DAYS.map((day) => getDay(env.DB, day.date)));

    await resetToSeed(env.DB);
    const employeesAfterSecond = await listEmployees(env.DB);
    const daysAfterSecond = await Promise.all(SEED_DAYS.map((day) => getDay(env.DB, day.date)));

    expect(employeesAfterSecond).toEqual(employeesAfterFirst);
    expect(daysAfterSecond).toEqual(daysAfterFirst);
  });
});
