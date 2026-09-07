import { describe, expect, it } from "vitest";

import { createUpperBoundFixture } from "./fixture";
import { ROLES, SLOT_COUNT } from "./types";

describe("createUpperBoundFixture", () => {
  it("creates ten employees who can work every role for the whole day", () => {
    const fixture = createUpperBoundFixture();

    expect(fixture.employees).toHaveLength(10);
    expect(
      fixture.employees.every(
        (employee) =>
          employee.roles.length === ROLES.length &&
          employee.availability?.start === 0 &&
          employee.availability?.end === SLOT_COUNT &&
          employee.minShiftLength === 8 &&
          employee.maxShiftLength === 16,
      ),
    ).toBe(true);
  });

  it("uses one required worker normally and two around the middle slots", () => {
    const fixture = createUpperBoundFixture();

    expect(fixture.requirements).toHaveLength(SLOT_COUNT);
    expect(fixture.requirements[0].hall).toBe(1);
    expect(fixture.requirements[13].hall).toBe(2);
    expect(fixture.requirements[14].hall).toBe(2);
    expect(fixture.requirements[27].hall).toBe(1);
  });
});
