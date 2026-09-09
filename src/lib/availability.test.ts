import { describe, expect, it } from "vitest";
import { isOff, setEmployeeAvailability } from "./availability";
import type { DayAvailability } from "./domain/day";

describe("setEmployeeAvailability", () => {
  it("sets the availability window for an employee", () => {
    const result = setEmployeeAvailability({}, "e1", { start: 0, end: 16 });

    expect(result).toEqual({ e1: { start: 0, end: 16 } });
  });

  it("does not mutate the input object", () => {
    const availability: DayAvailability = {};

    setEmployeeAvailability(availability, "e1", { start: 0, end: 16 });

    expect(availability).toEqual({});
  });

  it("removes the entry when set to null (marks the employee off that day)", () => {
    const availability: DayAvailability = { e1: { start: 0, end: 16 }, e2: { start: 4, end: 20 } };

    const result = setEmployeeAvailability(availability, "e1", null);

    expect(result).toEqual({ e2: { start: 4, end: 20 } });
  });

  it("leaves other employees' windows untouched", () => {
    const availability: DayAvailability = { e2: { start: 4, end: 20 } };

    const result = setEmployeeAvailability(availability, "e1", { start: 0, end: 8 });

    expect(result).toEqual({ e1: { start: 0, end: 8 }, e2: { start: 4, end: 20 } });
  });
});

describe("isOff", () => {
  it("returns true when the employee has no entry", () => {
    expect(isOff({}, "e1")).toBe(true);
  });

  it("returns false when the employee has an availability window", () => {
    expect(isOff({ e1: { start: 0, end: 16 } }, "e1")).toBe(false);
  });
});
