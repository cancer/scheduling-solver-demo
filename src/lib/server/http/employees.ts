import type { StoredEmployee } from "../db/employees";
import { ValidationError } from "./errors";
import { expectArray, expectFiniteNumber, expectObject, expectString, isRole } from "./validation";

// 契約 `PUT /api/employees` の body `{ employees: StoredEmployee[] }` を検証する。
export function parseEmployeesRequestBody(body: unknown): readonly StoredEmployee[] {
  const record = expectObject(body, "リクエストボディ");
  return expectArray(record.employees, "employees").map(parseStoredEmployee);
}

function parseStoredEmployee(value: unknown): StoredEmployee {
  const record = expectObject(value, "employees[]");
  const roles = expectArray(record.roles, "employees[].roles");
  if (!roles.every(isRole)) {
    throw new ValidationError(
      `employees[].roles に未知の role が含まれている: ${JSON.stringify(roles)}`,
    );
  }
  return {
    id: expectString(record.id, "employees[].id"),
    name: expectString(record.name, "employees[].name"),
    roles,
    minShiftLength: expectFiniteNumber(record.minShiftLength, "employees[].minShiftLength"),
    maxShiftLength: expectFiniteNumber(record.maxShiftLength, "employees[].maxShiftLength"),
  };
}
