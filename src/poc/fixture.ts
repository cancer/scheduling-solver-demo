import { MAX_SHIFT_LENGTH, MIN_SHIFT_LENGTH, ROLES, SLOT_COUNT } from "./types";
import type { ScheduleFixture, SlotRequirements } from "./types";

export function createUpperBoundFixture(): ScheduleFixture {
  // The upper-bound measurement uses 10 employees, all four roles, and full-day
  // availability. This yields 153 patterns per employee-role pair, or 6,120
  // binary variables. Requiring two people in the two central slots creates
  // overlap in the coverage matrix while keeping the fixture deterministic.
  const employees = Array.from({ length: 10 }, (_, index) => ({
    id: `employee-${String(index + 1).padStart(2, "0")}`,
    name: `従業員${String(index + 1).padStart(2, "0")}`,
    roles: [...ROLES],
    availability: { start: 0, end: SLOT_COUNT },
    minShiftLength: MIN_SHIFT_LENGTH,
    maxShiftLength: MAX_SHIFT_LENGTH,
  }));

  const requirements: SlotRequirements[] = Array.from({ length: SLOT_COUNT }, (_, slot) => {
    const minimum = slot === 13 || slot === 14 ? 2 : 1;
    return {
      hall: minimum,
      hot: minimum,
      cold: minimum,
      dishwashing: minimum,
    };
  });

  return { employees, requirements };
}
