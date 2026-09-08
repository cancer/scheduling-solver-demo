// LP モデルの構築（純関数。ソルバーを呼ばない）。もとは `src/poc/lp.ts` + `src/poc/types.ts`
// にあったロジックを、工程4以降が呼ぶモジュール境界として移設した
// （`/private/tmp/.../scratchpad/contract.md` の `src/lib/solver/model.ts`）。
import { ROLES, SLOT_COUNT } from "../domain/shift";
import type { Employee, Role, SlotRequirements } from "../domain/shift";
import type { StoredAssignment } from "../domain/day";

import { generateShiftCandidates, shiftVariableName } from "./patterns";

export type ShiftCandidate = Readonly<{
  employeeId: string;
  role: Role;
  start: number;
  length: number;
  end: number;
  variableName: string;
}>;

export type ShortageVariable = Readonly<{
  slot: number;
  role: Role;
  name: string;
}>;

export type SolveInput = Readonly<{
  employees: readonly Employee[];
  requirements: readonly SlotRequirements[];
  pinnedAssignments: readonly StoredAssignment[];
}>;

export type LpModel = Readonly<{
  lpText: string;
  candidates: readonly ShiftCandidate[];
  binaryVariableNames: readonly string[];
  shortageVariables: readonly ShortageVariable[];
  penaltyM: number;
}>;

function paddedSlot(slot: number): string {
  return String(slot).padStart(2, "0");
}

function shortageVariableName(slot: number, role: Role): string {
  return `u_t${paddedSlot(slot)}_${role}`;
}

function employeeConstraintName(employeeId: string): string {
  const identifier = employeeId.replace(/[^A-Za-z0-9_]/g, "_");
  return `employee_${identifier || "employee"}_one_shift`;
}

export function calculatePenaltyM(employees: readonly Employee[]): number {
  const largestShiftLength = employees.reduce(
    (largest, employee) => Math.max(largest, employee.maxShiftLength),
    0,
  );
  return employees.length * largestShiftLength + 1;
}

function createShortageVariables(): readonly ShortageVariable[] {
  const shortageVariables: ShortageVariable[] = [];
  for (let slot = 0; slot < SLOT_COUNT; slot += 1) {
    for (const role of ROLES) {
      shortageVariables.push({
        slot,
        role,
        name: shortageVariableName(slot, role),
      });
    }
  }
  return shortageVariables;
}

function candidatesForCoverage(
  candidates: readonly ShiftCandidate[],
  slot: number,
  role: Role,
): readonly ShiftCandidate[] {
  return candidates.filter(
    (candidate) => candidate.role === role && candidate.start <= slot && candidate.end > slot,
  );
}

function employeeConstraint(employee: Employee, candidates: readonly ShiftCandidate[]): string {
  const variables = candidates
    .filter((candidate) => candidate.employeeId === employee.id)
    .map((candidate) => candidate.variableName);
  const expression = variables.length > 0 ? variables.join(" + ") : "0";
  return `${employeeConstraintName(employee.id)}: ${expression} <= 1`;
}

function coverageConstraint(
  shortage: ShortageVariable,
  candidates: readonly ShiftCandidate[],
  minimum: number,
): string {
  const coveringVariables = candidatesForCoverage(candidates, shortage.slot, shortage.role).map(
    (candidate) => candidate.variableName,
  );
  const expression = [...coveringVariables, shortage.name].join(" + ");
  return `${shortage.name}: ${expression} >= ${minimum}`;
}

/** ピン留めした割当の変数を1に固定する Bounds 行。同名の変数が候補に無くても
 * （目的関数・制約のどちらにも現れない自由変数として）LP としては成立する。
 * ピン留めは常に有効な候補（過去の求解結果 or 画面が生成した候補）を指す前提であり、
 * 呼び出し側の入力検証はこの関数の責務ではない。 */
function pinnedBound(assignment: StoredAssignment): string {
  const name = shiftVariableName(
    assignment.employeeId,
    assignment.role,
    assignment.start,
    assignment.length,
  );
  return `  ${name} = 1`;
}

export function buildLpModel(input: SolveInput): LpModel {
  const candidates = input.employees.flatMap(generateShiftCandidates);
  const shortageVariables = createShortageVariables();
  const penaltyM = calculatePenaltyM(input.employees);
  const objectiveTerms = [
    ...shortageVariables.map((shortage) => `${penaltyM} ${shortage.name}`),
    ...candidates.map((candidate) => `${candidate.length} ${candidate.variableName}`),
  ];
  const constraints = [
    ...input.employees.map((employee) => employeeConstraint(employee, candidates)),
    ...shortageVariables.map((shortage) =>
      coverageConstraint(shortage, candidates, input.requirements[shortage.slot][shortage.role]),
    ),
  ];
  const bounds = [
    ...shortageVariables.map((shortage) => `  0 <= ${shortage.name}`),
    ...input.pinnedAssignments.map((assignment) => pinnedBound(assignment)),
  ];
  const binaryVariableNames = candidates.map((candidate) => candidate.variableName);
  const lpText = [
    "Minimize",
    `  obj: ${objectiveTerms.join(" + ")}`,
    "Subject To",
    ...constraints.map((constraint) => `  ${constraint}`),
    "Bounds",
    ...bounds,
    "Binaries",
    ...binaryVariableNames.map((name) => `  ${name}`),
    "End",
    "",
  ].join("\n");

  return {
    lpText,
    candidates,
    binaryVariableNames,
    shortageVariables,
    penaltyM,
  };
}
