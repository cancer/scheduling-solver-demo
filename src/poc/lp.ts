import { generateShiftCandidates } from "./patterns";
import { ROLES, SLOT_COUNT } from "./types";
import type {
  Employee,
  LpModel,
  ScheduleFixture,
  Role,
  ShiftCandidate,
  ShortageVariable,
} from "./types";

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

export function buildLpModel(fixture: ScheduleFixture): LpModel {
  const candidates = fixture.employees.flatMap(generateShiftCandidates);
  const shortageVariables = createShortageVariables();
  const penaltyM = calculatePenaltyM(fixture.employees);
  const objectiveTerms = [
    ...shortageVariables.map((shortage) => `${penaltyM} ${shortage.name}`),
    ...candidates.map((candidate) => `${candidate.length} ${candidate.variableName}`),
  ];
  const constraints = [
    ...fixture.employees.map((employee) => employeeConstraint(employee, candidates)),
    ...shortageVariables.map((shortage) =>
      coverageConstraint(shortage, candidates, fixture.requirements[shortage.slot][shortage.role]),
    ),
  ];
  const bounds = shortageVariables.map((shortage) => `  0 <= ${shortage.name}`);
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
