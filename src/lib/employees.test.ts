import { describe, expect, it } from "vitest";
import {
  addEmployee,
  hoursToShiftLength,
  isValidShiftLengthRange,
  removeEmployee,
  shiftLengthToHours,
  toggleRole,
  updateEmployee,
} from "./employees";
import type { StoredEmployee } from "./api/types";

const alice: StoredEmployee = {
  id: "e1",
  name: "アリス",
  roles: ["hall"],
  minShiftLength: 8,
  maxShiftLength: 16,
};
const bob: StoredEmployee = {
  id: "e2",
  name: "ボブ",
  roles: ["hot"],
  minShiftLength: 8,
  maxShiftLength: 16,
};

describe("addEmployee", () => {
  it("appends the new employee to the end of the list", () => {
    expect(addEmployee([alice], bob)).toEqual([alice, bob]);
  });

  it("does not mutate the input list", () => {
    const list = [alice];

    addEmployee(list, bob);

    expect(list).toEqual([alice]);
  });
});

describe("updateEmployee", () => {
  it("merges the patch into the employee with the matching id", () => {
    const result = updateEmployee([alice, bob], "e1", { name: "アリス改" });

    expect(result).toEqual([{ ...alice, name: "アリス改" }, bob]);
  });

  it("leaves the list unchanged when no employee matches the id", () => {
    const result = updateEmployee([alice], "missing", { name: "x" });

    expect(result).toEqual([alice]);
  });
});

describe("removeEmployee", () => {
  it("removes the employee with the matching id", () => {
    expect(removeEmployee([alice, bob], "e1")).toEqual([bob]);
  });

  it("leaves the list unchanged when no employee matches the id", () => {
    expect(removeEmployee([alice], "missing")).toEqual([alice]);
  });
});

describe("toggleRole", () => {
  it("adds a role that is not yet present", () => {
    expect(toggleRole(["hall"], "hot")).toEqual(["hall", "hot"]);
  });

  it("removes a role that is already present", () => {
    expect(toggleRole(["hall", "hot"], "hall")).toEqual(["hot"]);
  });
});

describe("shift length conversion", () => {
  it("converts stored half-hour slots to display hours", () => {
    expect(shiftLengthToHours(8)).toBe(4);
    expect(shiftLengthToHours(1)).toBe(0.5);
  });

  it("converts half-hour display values to stored slots", () => {
    expect(hoursToShiftLength(4)).toBe(8);
    expect(hoursToShiftLength(0.5)).toBe(1);
  });

  it("rejects display values that are not half-hour increments within the business range", () => {
    expect(hoursToShiftLength(0)).toBeNull();
    expect(hoursToShiftLength(4.25)).toBeNull();
    expect(hoursToShiftLength(14.5)).toBeNull();
    expect(hoursToShiftLength(Number.NaN)).toBeNull();
  });
});

describe("isValidShiftLengthRange", () => {
  it("accepts a range from one slot through the opening hours", () => {
    expect(isValidShiftLengthRange(1, 28)).toBe(true);
    expect(isValidShiftLengthRange(8, 16)).toBe(true);
  });

  it("rejects a reversed or out-of-range slot range", () => {
    expect(isValidShiftLengthRange(17, 16)).toBe(false);
    expect(isValidShiftLengthRange(0, 16)).toBe(false);
    expect(isValidShiftLengthRange(1, 29)).toBe(false);
    expect(isValidShiftLengthRange(1.5, 2)).toBe(false);
  });
});
