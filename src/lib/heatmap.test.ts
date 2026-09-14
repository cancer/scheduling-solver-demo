import { describe, expect, it } from "vitest";
import {
  adjustCount,
  cellAriaLabel,
  heatLevel,
  isHourlySlot,
  roleLabel,
  setRequirement,
  slotStartLabel,
} from "./heatmap";
import { emptyRequirements, ROLES, SLOT_COUNT } from "./domain/shift";

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

describe("isHourlySlot", () => {
  it("keeps whole-hour headers and omits the intervening half-hour headers", () => {
    expect(isHourlySlot(0)).toBe(true);
    expect(isHourlySlot(1)).toBe(false);
    expect(isHourlySlot(2)).toBe(true);
    expect(isHourlySlot(27)).toBe(false);
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

describe("heatLevel", () => {
  it("maps a headcount to the level of the same number below the saturation point", () => {
    expect(heatLevel(0, 5)).toBe(0);
    expect(heatLevel(1, 5)).toBe(1);
    expect(heatLevel(4, 5)).toBe(4);
  });

  it("saturates at the maximum level", () => {
    expect(heatLevel(5, 5)).toBe(5);
    expect(heatLevel(20, 5)).toBe(5);
  });

  it("never goes below the zero level", () => {
    expect(heatLevel(-1, 5)).toBe(0);
  });

  it("saturates at a smaller maximum for the shortage scale", () => {
    expect(heatLevel(3, 3)).toBe(3);
    expect(heatLevel(9, 3)).toBe(3);
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
