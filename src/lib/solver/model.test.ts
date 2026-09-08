import { describe, expect, it } from "vitest";

import { MAX_SHIFT_LENGTH, MIN_SHIFT_LENGTH, ROLES, SLOT_COUNT } from "../domain/shift";
import type { Employee, SlotRequirements } from "../domain/shift";
import type { StoredAssignment } from "../domain/day";

import { buildLpModel, calculatePenaltyM } from "./model";
import type { SolveInput } from "./model";

// 6,120 変数の巨大な LP を作る入力。10人 × 全4役割 × 終日出勤可能というアッパーバウンド
// フィクスチャ（もとは `src/poc/fixture.ts` の `createUpperBoundFixture`）を、`src/poc` へ
// 依存させずに再現する。
function createUpperBoundInput(): SolveInput {
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
    return { hall: minimum, hot: minimum, cold: minimum, dishwashing: minimum };
  });

  return { employees, requirements, pinnedAssignments: [] };
}

// このモデルはテストごとに作り直さず1度だけ構築する。6,120変数のLPテキスト組み立ては
// 重く、`it` の中で毎回呼ぶとその分だけ各テストの実行時間に乗ってしまう
// （移設前は `src/poc/lp.test.ts` の一部が閾値1,000msを超えるslow testとして検出されていた）。
const upperBoundModel = buildLpModel(createUpperBoundInput());

const smallInput: SolveInput = {
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
  pinnedAssignments: [],
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
    expect(upperBoundModel.candidates).toHaveLength(6120);
    expect(upperBoundModel.binaryVariableNames).toHaveLength(6120);
  });

  it("creates one shortage variable and coverage constraint for every slot and role", () => {
    expect(upperBoundModel.shortageVariables).toHaveLength(SLOT_COUNT * ROLES.length);
    for (const shortage of upperBoundModel.shortageVariables) {
      expect(upperBoundModel.lpText).toContain(`${shortage.name}:`);
    }
  });

  it("emits one-shift-at-most constraints for every employee", () => {
    // `String#match` with an unanchored `[^\n]+` regex over this ~2.5MB lpText took over
    // 800ms by itself (measured directly, independent of buildLpModel) and was flagged as a
    // slow test (>1,000ms) before the move to `src/lib/solver`. `split` + `includes` finds the
    // same 10 lines in ~1ms.
    const oneShiftLines = upperBoundModel.lpText
      .split("\n")
      .filter((line) => line.includes("_one_shift:"));
    expect(oneShiftLines).toHaveLength(10);
    expect(upperBoundModel.lpText).toContain("<= 1");
  });

  it("uses M=161 and gives shortage variables the primary objective weight", () => {
    const input = createUpperBoundInput();

    expect(calculatePenaltyM(input.employees)).toBe(161);
    expect(upperBoundModel.penaltyM).toBe(161);
    expect(upperBoundModel.lpText).toContain(`161 ${upperBoundModel.shortageVariables[0].name}`);
  });

  it("keeps LP text deterministic for the same input", () => {
    const input = createUpperBoundInput();

    expect(buildLpModel(input).lpText).toBe(buildLpModel(input).lpText);
  });

  it("encodes employee ownership, coverage, objective, and variable domains", () => {
    const model = buildLpModel(smallInput);
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
        rhs: smallInput.requirements[shortage.slot][shortage.role],
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
    const assignmentName = upperBoundModel.binaryVariableNames[0];
    const shortageName = upperBoundModel.shortageVariables[0].name;

    expect(upperBoundModel.lpText).toContain("Binaries");
    expect(upperBoundModel.lpText).toContain(`  ${assignmentName}`);
    expect(upperBoundModel.lpText).toContain(`  0 <= ${shortageName}`);
  });

  it("emits a valid empty one-shift expression for an unavailable employee", () => {
    const requirements = Array.from({ length: SLOT_COUNT }, () => ({
      hall: 0,
      hot: 0,
      cold: 0,
      dishwashing: 0,
    }));
    const input: SolveInput = {
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
      pinnedAssignments: [],
    };

    expect(buildLpModel(input).lpText).toContain("employee_employee_one_shift: 0 <= 1");
  });
});

describe("buildLpModel pinned assignments", () => {
  it("fixes the pinned assignment's variable to 1 in Bounds", () => {
    const pinned: StoredAssignment = { employeeId: "alpha", role: "hall", start: 1, length: 2 };
    const input: SolveInput = { ...smallInput, pinnedAssignments: [pinned] };

    const model = buildLpModel(input);

    const bounds = sectionLines(model.lpText, "Bounds", "Binaries");
    expect(bounds).toContain("x_alpha_hall_s01_l02 = 1");
  });

  it("fixes every pinned assignment when there are several", () => {
    const pinnedAlpha: StoredAssignment = {
      employeeId: "alpha",
      role: "hall",
      start: 1,
      length: 2,
    };
    const pinnedBeta: StoredAssignment = { employeeId: "beta", role: "hot", start: 0, length: 2 };
    const input: SolveInput = {
      ...smallInput,
      pinnedAssignments: [pinnedAlpha, pinnedBeta],
    };

    const model = buildLpModel(input);

    const bounds = sectionLines(model.lpText, "Bounds", "Binaries");
    expect(bounds).toContain("x_alpha_hall_s01_l02 = 1");
    expect(bounds).toContain("x_beta_hot_s00_l02 = 1");
  });

  it("does not fix any variable when there are no pinned assignments", () => {
    const model = buildLpModel(smallInput);

    expect(model.lpText).not.toContain(" = 1");
  });
});
