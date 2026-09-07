import { describe, expect, it } from "vitest";

import { createUpperBoundFixture } from "./fixture";
import { buildLpModel, calculatePenaltyM } from "./lp";
import { ROLES, SLOT_COUNT } from "./types";
import type { ScheduleFixture } from "./types";

describe("buildLpModel", () => {
  it("creates 6120 binary variables for the upper-bound fixture", () => {
    const model = buildLpModel(createUpperBoundFixture());

    expect(model.candidates).toHaveLength(6120);
    expect(model.binaryVariableNames).toHaveLength(6120);
  });

  it("creates one shortage variable and coverage constraint for every slot and role", () => {
    const model = buildLpModel(createUpperBoundFixture());

    expect(model.shortageVariables).toHaveLength(SLOT_COUNT * ROLES.length);
    for (const shortage of model.shortageVariables) {
      expect(model.lpText).toContain(`${shortage.name}:`);
    }
  });

  it("emits one-shift-at-most constraints for every employee", () => {
    const model = buildLpModel(createUpperBoundFixture());

    expect(model.lpText.match(/employee_[^\n]+_one_shift:/g)).toHaveLength(10);
    expect(model.lpText).toContain("<= 1");
  });

  it("uses M=161 and gives shortage variables the primary objective weight", () => {
    const fixture = createUpperBoundFixture();
    const model = buildLpModel(fixture);

    expect(calculatePenaltyM(fixture.employees)).toBe(161);
    expect(model.penaltyM).toBe(161);
    expect(model.lpText).toContain(`161 ${model.shortageVariables[0].name}`);
  });

  it("keeps LP text deterministic for the same input", () => {
    const fixture = createUpperBoundFixture();

    expect(buildLpModel(fixture).lpText).toBe(buildLpModel(fixture).lpText);
  });

  it("declares binary assignment variables and nonnegative shortage variables", () => {
    const model = buildLpModel(createUpperBoundFixture());
    const assignmentName = model.binaryVariableNames[0];
    const shortageName = model.shortageVariables[0].name;

    expect(model.lpText).toContain("Binaries");
    expect(model.lpText).toContain(`  ${assignmentName}`);
    expect(model.lpText).toContain(`  0 <= ${shortageName}`);
  });

  it("emits a valid empty one-shift expression for an unavailable employee", () => {
    const requirements = Array.from({ length: SLOT_COUNT }, () => ({
      hall: 0,
      hot: 0,
      cold: 0,
      dishwashing: 0,
    }));
    const fixture: ScheduleFixture = {
      employees: [
        {
          id: "",
          name: "休み",
          roles: ["hall"],
          minShiftLength: 8,
          maxShiftLength: 16,
        },
      ],
      requirements,
    };

    expect(buildLpModel(fixture).lpText).toContain("employee_employee_one_shift: 0 <= 1");
  });
});
