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

  it("fixes every slot-role requirement in the upper-bound measurement input", () => {
    const fixture = createUpperBoundFixture();
    // The measurement input intentionally requires one worker per role in the
    // ordinary slots and two workers per role in the two central slots. Keeping
    // all 28 rows and four role values independent from the factory output
    // makes an accidental change to the measured requirement matrix fail here.
    const expectedRequirements = [
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 2, hot: 2, cold: 2, dishwashing: 2 },
      { hall: 2, hot: 2, cold: 2, dishwashing: 2 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
      { hall: 1, hot: 1, cold: 1, dishwashing: 1 },
    ];

    expect(fixture.requirements).toEqual(expectedRequirements);
  });
});
