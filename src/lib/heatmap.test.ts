import { describe, expect, it } from "vitest";
import {
  adjustCount,
  cellAriaLabel,
  heatColor,
  roleLabel,
  setRequirement,
  slotStartLabel,
} from "./heatmap";
import { ROLES, SLOT_COUNT } from "./domain/shift";
import type { SlotRequirements } from "./domain/shift";

function emptyRequirements(): SlotRequirements[] {
  return Array.from({ length: SLOT_COUNT }, () => ({
    hall: 0,
    hot: 0,
    cold: 0,
    dishwashing: 0,
  }));
}

describe("slotStartLabel", () => {
  it("labels slot 0 as the opening time", () => {
    expect(slotStartLabel(0)).toBe("10:00");
  });

  it("labels slot 4 as noon (30min * 4 after 10:00)", () => {
    expect(slotStartLabel(4)).toBe("12:00");
  });

  it("labels the last slot as 23:30", () => {
    expect(slotStartLabel(SLOT_COUNT - 1)).toBe("23:30");
  });
});

describe("roleLabel", () => {
  it("has a Japanese label for every role", () => {
    for (const role of ROLES) {
      expect(roleLabel(role).length).toBeGreaterThan(0);
    }
  });
});

describe("cellAriaLabel", () => {
  it("combines role, time and headcount into one label", () => {
    expect(cellAriaLabel("hall", 4, 2)).toBe("ホール 12:00 必要人数2人");
  });
});

describe("adjustCount", () => {
  it("increases the count by the delta", () => {
    expect(adjustCount(2, 1)).toBe(3);
  });

  it("does not go below zero", () => {
    expect(adjustCount(0, -1)).toBe(0);
  });

  it("does not exceed the maximum of 99", () => {
    expect(adjustCount(99, 1)).toBe(99);
  });
});

describe("heatColor", () => {
  it("returns a lighter color for a lower count", () => {
    const low = heatColor(1, 6);
    const high = heatColor(6, 6);
    expect(low).not.toBe(high);
  });

  it("returns the same color once the count reaches the scale max", () => {
    expect(heatColor(6, 6)).toBe(heatColor(20, 6));
  });

  it("returns a distinct color for zero", () => {
    expect(heatColor(0, 6)).not.toBe(heatColor(1, 6));
  });
});

describe("setRequirement", () => {
  it("updates only the targeted slot and role", () => {
    const requirements = emptyRequirements();

    const updated = setRequirement(requirements, "hot", 4, 3);

    expect(updated[4]).toEqual({ hall: 0, hot: 3, cold: 0, dishwashing: 0 });
    expect(updated[0]).toEqual({ hall: 0, hot: 0, cold: 0, dishwashing: 0 });
  });

  it("does not mutate the input array", () => {
    const requirements = emptyRequirements();

    setRequirement(requirements, "hot", 4, 3);

    expect(requirements[4].hot).toBe(0);
  });
});
