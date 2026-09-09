import { ROLES, SLOT_COUNT } from "../domain/shift";
import type { Employee, Role } from "../domain/shift";
import type { ShiftCandidate } from "./model";

function stableIdentifier(value: string): string {
  const identifier = value.replace(/[^A-Za-z0-9_]/g, "_");
  return identifier.length > 0 ? identifier : "employee";
}

/** LP変数名の唯一の生成箇所。ピン留めの固定（`model.ts`）も同じ名前を組み立てて参照する。 */
export function shiftVariableName(
  employeeId: string,
  role: Role,
  start: number,
  length: number,
): string {
  const paddedStart = String(start).padStart(2, "0");
  const paddedLength = String(length).padStart(2, "0");
  return `x_${stableIdentifier(employeeId)}_${role}_s${paddedStart}_l${paddedLength}`;
}

export function generateShiftCandidates(employee: Employee): readonly ShiftCandidate[] {
  if (!employee.availability) {
    return [];
  }

  const candidates: ShiftCandidate[] = [];
  const availableRoles = ROLES.filter((role) => employee.roles.includes(role));

  for (const role of availableRoles) {
    for (let length = employee.minShiftLength; length <= employee.maxShiftLength; length += 1) {
      for (let start = 0; start + length <= SLOT_COUNT; start += 1) {
        const end = start + length;
        if (start < employee.availability.start || end > employee.availability.end) {
          continue;
        }

        candidates.push({
          employeeId: employee.id,
          role,
          start,
          length,
          end,
          variableName: shiftVariableName(employee.id, role, start, length),
        });
      }
    }
  }

  return candidates;
}
