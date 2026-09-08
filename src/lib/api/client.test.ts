import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "./client";
import type { DayData, StoredAssignment } from "../domain/day";
import type { StoredEmployee } from "./types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const employee: StoredEmployee = {
  id: "e1",
  name: "アリス",
  roles: ["hall"],
  minShiftLength: 8,
  maxShiftLength: 16,
};

const day: DayData = {
  requirements: [],
  availability: {},
  pinnedAssignments: [],
  solution: null,
};

describe("createApiClient", () => {
  it("getEmployees issues a GET to /api/employees and returns the parsed list", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ employees: [employee] }));
    const client = createApiClient(fetchFn);

    const result = await client.getEmployees();

    expect(fetchFn).toHaveBeenCalledWith("/api/employees", undefined);
    expect(result).toEqual([employee]);
  });

  it("putEmployees issues a PUT with the employees as the JSON body", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ employees: [employee] }));
    const client = createApiClient(fetchFn);

    const result = await client.putEmployees([employee]);

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/employees",
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({ employees: [employee] }),
      }),
    );
    expect(result).toEqual([employee]);
  });

  it("getDay issues a GET to /api/days/[date] and returns the day", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ day }));
    const client = createApiClient(fetchFn);

    const result = await client.getDay("2026-09-08");

    expect(fetchFn).toHaveBeenCalledWith("/api/days/2026-09-08", undefined);
    expect(result).toEqual(day);
  });

  it("putDay issues a PUT with the day as the JSON body", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ day }));
    const client = createApiClient(fetchFn);

    const result = await client.putDay("2026-09-08", day);

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/days/2026-09-08",
      expect.objectContaining({ method: "PUT", body: JSON.stringify({ day }) }),
    );
    expect(result).toEqual(day);
  });

  it("solveDay posts the pinned assignments and returns the solved day", async () => {
    const pinned: readonly StoredAssignment[] = [
      { employeeId: "e1", role: "hall", start: 0, length: 8 },
    ];
    const solvedDay: DayData = { ...day, pinnedAssignments: pinned };
    const fetchFn = vi.fn(async () => jsonResponse({ day: solvedDay }));
    const client = createApiClient(fetchFn);

    const result = await client.solveDay("2026-09-08", pinned);

    expect(fetchFn).toHaveBeenCalledWith(
      "/api/days/2026-09-08/solve",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ pinnedAssignments: pinned }),
      }),
    );
    expect(result).toEqual(solvedDay);
  });

  it("reset posts to /api/reset", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ ok: true }));
    const client = createApiClient(fetchFn);

    await client.reset();

    expect(fetchFn).toHaveBeenCalledWith("/api/reset", expect.objectContaining({ method: "POST" }));
  });

  it("throws an Error carrying the server's error message on a non-ok response", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ error: "不正な日付形式" }, 400));
    const client = createApiClient(fetchFn);

    await expect(client.getDay("bad-date")).rejects.toThrow("不正な日付形式");
  });

  it("falls back to a generic message when the error response has no error field", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({}, 500));
    const client = createApiClient(fetchFn);

    await expect(client.getDay("2026-09-08")).rejects.toThrow("HTTP 500");
  });
});
