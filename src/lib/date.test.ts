import { describe, expect, it } from "vitest";
import { formatDateISO } from "./date";

describe("formatDateISO", () => {
  it("formats a date as YYYY-MM-DD in the local timezone", () => {
    expect(formatDateISO(new Date(2026, 8, 8))).toBe("2026-09-08");
  });

  it("pads single-digit months and days", () => {
    expect(formatDateISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
