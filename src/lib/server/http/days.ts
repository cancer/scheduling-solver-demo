import { ROLES, SLOT_COUNT } from "../../domain/shift";
import type { SlotRequirements } from "../../domain/shift";
import type {
  DayAvailability,
  DayData,
  StoredAssignment,
  StoredShortage,
  StoredSolution,
} from "../../domain/day";
import { ValidationError } from "./errors";
import { expectArray, expectFiniteNumber, expectObject, expectString, isRole } from "./validation";

// 契約 `PUT /api/days/[date]` の body `{ day: DayData }` を検証する。
export function parseDayRequestBody(body: unknown): DayData {
  const record = expectObject(body, "リクエストボディ");
  return parseDayData(record.day, "day");
}

// 契約 `POST /api/days/[date]/solve` の body `{ pinnedAssignments: StoredAssignment[] }` を検証する。
export function parseSolveRequestBody(body: unknown): readonly StoredAssignment[] {
  const record = expectObject(body, "リクエストボディ");
  return parseAssignments(record.pinnedAssignments, "pinnedAssignments");
}

function parseDayData(value: unknown, label: string): DayData {
  const record = expectObject(value, label);
  return {
    requirements: parseRequirementsList(record.requirements, `${label}.requirements`),
    availability: parseAvailability(record.availability, `${label}.availability`),
    pinnedAssignments: parseAssignments(record.pinnedAssignments, `${label}.pinnedAssignments`),
    solution: parseSolutionOrNull(record.solution, `${label}.solution`),
  };
}

function parseRequirementsList(value: unknown, label: string): readonly SlotRequirements[] {
  const list = expectArray(value, label);
  if (list.length !== SLOT_COUNT) {
    throw new ValidationError(`${label} は ${SLOT_COUNT} 件でなければならない: ${list.length}件`);
  }
  return list.map((item, index) => parseSlotRequirements(item, `${label}[${index}]`));
}

function parseSlotRequirements(value: unknown, label: string): SlotRequirements {
  const record = expectObject(value, label);
  const entries = ROLES.map(
    (role) => [role, expectFiniteNumber(record[role], `${label}.${role}`)] as const,
  );
  return Object.fromEntries(entries) as SlotRequirements;
}

function parseAvailability(value: unknown, label: string): DayAvailability {
  const record = expectObject(value, label);
  const entries = Object.entries(record).map(([employeeId, window]) => {
    const windowRecord = expectObject(window, `${label}.${employeeId}`);
    return [
      employeeId,
      {
        start: expectFiniteNumber(windowRecord.start, `${label}.${employeeId}.start`),
        end: expectFiniteNumber(windowRecord.end, `${label}.${employeeId}.end`),
      },
    ] as const;
  });
  return Object.fromEntries(entries);
}

function parseAssignments(value: unknown, label: string): readonly StoredAssignment[] {
  return expectArray(value, label).map((item, index) =>
    parseAssignment(item, `${label}[${index}]`),
  );
}

function parseAssignment(value: unknown, label: string): StoredAssignment {
  const record = expectObject(value, label);
  if (!isRole(record.role)) {
    throw new ValidationError(`${label}.role が未知の role である: ${JSON.stringify(record.role)}`);
  }
  return {
    employeeId: expectString(record.employeeId, `${label}.employeeId`),
    role: record.role,
    start: expectFiniteNumber(record.start, `${label}.start`),
    length: expectFiniteNumber(record.length, `${label}.length`),
  };
}

function parseSolutionOrNull(value: unknown, label: string): StoredSolution | null {
  if (value === null) {
    return null;
  }
  const record = expectObject(value, label);
  return {
    status: expectString(record.status, `${label}.status`),
    objectiveValue: expectFiniteNumber(record.objectiveValue, `${label}.objectiveValue`),
    assignments: parseAssignments(record.assignments, `${label}.assignments`),
    shortages: parseShortages(record.shortages, `${label}.shortages`),
  };
}

function parseShortages(value: unknown, label: string): readonly StoredShortage[] {
  return expectArray(value, label).map((item, index) => parseShortage(item, `${label}[${index}]`));
}

function parseShortage(value: unknown, label: string): StoredShortage {
  const record = expectObject(value, label);
  if (!isRole(record.role)) {
    throw new ValidationError(`${label}.role が未知の role である: ${JSON.stringify(record.role)}`);
  }
  return {
    slot: expectFiniteNumber(record.slot, `${label}.slot`),
    role: record.role,
    amount: expectFiniteNumber(record.amount, `${label}.amount`),
  };
}
