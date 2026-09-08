import { describe, expect, it } from "vitest";
import { ValidationError } from "./errors";
import { parseDateParam } from "./date";

describe("parseDateParam", () => {
  it("returns the value unchanged when it is a valid YYYY-MM-DD date", () => {
    expect(parseDateParam("2026-09-08")).toBe("2026-09-08");
  });

  it("throws ValidationError when the value is undefined", () => {
    expect(() => parseDateParam(undefined)).toThrow(ValidationError);
  });

  it("throws ValidationError when the value does not match YYYY-MM-DD", () => {
    expect(() => parseDateParam("2026/09/08")).toThrow(ValidationError);
  });

  it("throws ValidationError when the value is not a real calendar date", () => {
    expect(() => parseDateParam("2026-02-30")).toThrow(ValidationError);
  });
});
