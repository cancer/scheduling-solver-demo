import { describe, expect, it } from "vitest";
import { ValidationError } from "./errors";
import { parseEmployeesRequestBody } from "./employees";

describe("parseEmployeesRequestBody", () => {
  it("parses a valid employees list", () => {
    const body = {
      employees: [
        {
          id: "alice",
          name: "アリス",
          roles: ["hall", "hot"],
          minShiftLength: 8,
          maxShiftLength: 12,
        },
      ],
    };

    expect(parseEmployeesRequestBody(body)).toEqual(body.employees);
  });

  it("parses an empty employees list", () => {
    expect(parseEmployeesRequestBody({ employees: [] })).toEqual([]);
  });

  it("throws ValidationError when employees is missing", () => {
    expect(() => parseEmployeesRequestBody({})).toThrow(ValidationError);
  });

  it("throws ValidationError when employees is not an array", () => {
    expect(() => parseEmployeesRequestBody({ employees: "not-an-array" })).toThrow(ValidationError);
  });

  it("throws ValidationError when an employee has an unknown role", () => {
    const body = {
      employees: [
        {
          id: "alice",
          name: "アリス",
          roles: ["not-a-role"],
          minShiftLength: 8,
          maxShiftLength: 12,
        },
      ],
    };

    expect(() => parseEmployeesRequestBody(body)).toThrow(ValidationError);
  });

  it("throws ValidationError when an employee is missing a required field", () => {
    const body = {
      employees: [{ id: "alice", roles: ["hall"], minShiftLength: 8, maxShiftLength: 12 }],
    };

    expect(() => parseEmployeesRequestBody(body)).toThrow(ValidationError);
  });

  it("throws ValidationError when the body itself is not an object", () => {
    expect(() => parseEmployeesRequestBody("not-an-object")).toThrow(ValidationError);
  });
});
