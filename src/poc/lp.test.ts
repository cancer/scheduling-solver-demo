import { describe, expect, it } from "vitest";

import { createUpperBoundFixture } from "./fixture";
import { buildLpModel, calculatePenaltyM } from "./lp";
import { ROLES, SLOT_COUNT } from "./types";
import type { Employee, ScheduleFixture } from "./types";

const smallFixture: ScheduleFixture = {
  employees: [
    {
      id: "alpha",
      name: "Alpha",
      roles: ["hall"],
      availability: { start: 1, end: 5 },
      minShiftLength: 2,
      maxShiftLength: 3,
    },
    {
      id: "beta",
      name: "Beta",
      roles: ["hot"],
      availability: { start: 0, end: 4 },
      minShiftLength: 2,
      maxShiftLength: 2,
    },
  ],
  requirements: Array.from({ length: SLOT_COUNT }, (_, slot) => ({
    hall: slot === 2 ? 2 : 0,
    hot: slot === 0 ? 1 : 0,
    cold: 0,
    dishwashing: 0,
  })),
};

function sectionLines(lpText: string, section: string, nextSection: string): string[] {
  const lines = lpText.split("\n");
  const start = lines.indexOf(section) + 1;
  const end = lines.indexOf(nextSection);
  return lines
    .slice(start, end)
    .map((line) => line.trim())
    .filter(Boolean);
}

function constraintParts(
  lpText: string,
  name: string,
): { terms: string[]; operator: string; rhs: number } {
  const line = lpText
    .split("\n")
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.startsWith(`${name}:`));
  if (!line) {
    throw new Error(`Missing constraint ${name}`);
  }

  const match = /: (.+) (<=|>=) (\d+)$/.exec(line);
  if (!match) {
    throw new Error(`Malformed constraint ${line}`);
  }

  return {
    terms: match[1].split(" + "),
    operator: match[2],
    rhs: Number(match[3]),
  };
}

function objectiveTerms(lpText: string): Map<string, number> {
  const line = lpText
    .split("\n")
    .map((candidate) => candidate.trim())
    .find((candidate) => candidate.startsWith("obj:"));
  if (!line) {
    throw new Error("Missing objective");
  }

  return new Map(
    line
      .slice("obj: ".length)
      .split(" + ")
      .map((term) => {
        const [coefficient, variableName] = term.split(" ");
        return [variableName, Number(coefficient)] as const;
      }),
  );
}

function employeeWithMaxShiftLength(id: string, maxShiftLength: number): Employee {
  return {
    id,
    name: id,
    roles: [],
    minShiftLength: 1,
    maxShiftLength,
  };
}

describe("calculatePenaltyM", () => {
  it.each([
    { maxShiftLengths: [4], expectedPenaltyM: 5 },
    { maxShiftLengths: [3, 5], expectedPenaltyM: 11 },
    { maxShiftLengths: [4, 7, 6], expectedPenaltyM: 22 },
  ])(
    "uses employee count and largest shift length independently of the LP model",
    ({ maxShiftLengths, expectedPenaltyM }) => {
      const employees = maxShiftLengths.map((maxShiftLength, index) =>
        employeeWithMaxShiftLength(`employee-${index}`, maxShiftLength),
      );

      expect(calculatePenaltyM(employees)).toBe(expectedPenaltyM);
    },
  );
});

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

  it("encodes employee ownership, coverage, objective, and variable domains", () => {
    const model = buildLpModel(smallFixture);
    const alphaCandidates = model.candidates.filter(
      (candidate) => candidate.employeeId === "alpha",
    );
    const betaCandidates = model.candidates.filter((candidate) => candidate.employeeId === "beta");

    expect(alphaCandidates.map((candidate) => candidate.variableName)).toEqual([
      "x_alpha_hall_s01_l02",
      "x_alpha_hall_s02_l02",
      "x_alpha_hall_s03_l02",
      "x_alpha_hall_s01_l03",
      "x_alpha_hall_s02_l03",
    ]);
    expect(betaCandidates.map((candidate) => candidate.variableName)).toEqual([
      "x_beta_hot_s00_l02",
      "x_beta_hot_s01_l02",
      "x_beta_hot_s02_l02",
    ]);

    const alphaConstraint = constraintParts(model.lpText, "employee_alpha_one_shift");
    expect(alphaConstraint).toEqual({
      terms: alphaCandidates.map((candidate) => candidate.variableName),
      operator: "<=",
      rhs: 1,
    });
    const betaConstraint = constraintParts(model.lpText, "employee_beta_one_shift");
    expect(betaConstraint).toEqual({
      terms: betaCandidates.map((candidate) => candidate.variableName),
      operator: "<=",
      rhs: 1,
    });

    for (const shortage of model.shortageVariables) {
      const constraint = constraintParts(model.lpText, shortage.name);
      const coveringCandidates = model.candidates
        .filter(
          (candidate) =>
            candidate.role === shortage.role &&
            candidate.start <= shortage.slot &&
            candidate.end > shortage.slot,
        )
        .map((candidate) => candidate.variableName);
      expect(constraint).toEqual({
        terms: [...coveringCandidates, shortage.name],
        operator: ">=",
        rhs: smallFixture.requirements[shortage.slot][shortage.role],
      });
    }

    const terms = objectiveTerms(model.lpText);
    expect(terms).toHaveLength(model.shortageVariables.length + model.candidates.length);
    for (const shortage of model.shortageVariables) {
      expect(terms.get(shortage.name)).toBe(model.penaltyM);
    }
    for (const candidate of model.candidates) {
      expect(terms.get(candidate.variableName)).toBe(candidate.length);
    }

    const bounds = sectionLines(model.lpText, "Bounds", "Binaries");
    expect(new Set(bounds)).toEqual(
      new Set(model.shortageVariables.map((shortage) => `0 <= ${shortage.name}`)),
    );
    const binaries = sectionLines(model.lpText, "Binaries", "End");
    expect(new Set(binaries)).toEqual(new Set(model.binaryVariableNames));
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
