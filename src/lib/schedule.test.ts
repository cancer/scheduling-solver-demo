import { describe, expect, it } from "vitest";
import {
  assignmentBarPosition,
  assignmentBarStyle,
  assignmentLabel,
  buildShortageGrid,
  shortageAriaLabel,
} from "./schedule";
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

describe("assignmentBarPosition", () => {
  it("maps a shift start and length to the timeline grid columns", () => {
    expect(assignmentBarPosition({ start: 0, length: 8 })).toMatchObject({
      columnStart: 1,
      columnSpan: 8,
    });
  });

  it("keeps a late shift inside the 28-slot timeline", () => {
    expect(assignmentBarPosition({ start: 20, length: 8 })).toMatchObject({
      columnStart: 21,
      columnSpan: 8,
    });
  });
});

describe("assignmentBarStyle", () => {
  it("returns the CSS grid placement for the timeline bar", () => {
    expect(assignmentBarStyle({ start: 4, length: 8 })).toBe("grid-column: 5 / span 8;");
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
