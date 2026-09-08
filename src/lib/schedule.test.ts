import { describe, expect, it } from "vitest";
import { assignmentLabel, buildShortageGrid, shortageAriaLabel } from "./schedule";
import { SLOT_COUNT } from "./domain/shift";

describe("assignmentLabel", () => {
  it("names the employee, role, and start-end time range", () => {
    expect(assignmentLabel("アリス", "hall", 0, 8)).toBe("アリス ホール 10:00-14:00");
  });
});

describe("shortageAriaLabel", () => {
  it("combines role, time and shortage amount into one label", () => {
    expect(shortageAriaLabel("hall", 4, 2)).toBe("ホール 12:00 不足2人");
  });
});

describe("buildShortageGrid", () => {
  it("produces one entry per slot defaulting to zero shortage for every role", () => {
    const grid = buildShortageGrid([]);

    expect(grid).toHaveLength(SLOT_COUNT);
    expect(grid[0]).toEqual({ hall: 0, hot: 0, cold: 0, dishwashing: 0 });
  });

  it("places each shortage at its slot and role", () => {
    const grid = buildShortageGrid([{ slot: 4, role: "hall", amount: 2 }]);

    expect(grid[4].hall).toBe(2);
    expect(grid[0].hall).toBe(0);
  });
});
