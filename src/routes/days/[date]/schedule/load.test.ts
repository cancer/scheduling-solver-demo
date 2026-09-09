import { describe, expect, it, vi } from "vitest";
import { load } from "./+page";

describe("schedule page load", () => {
  it("loads the shared employees and the selected schedule date", async () => {
    const employees = [
      { id: "e1", name: "アリス", roles: ["hall"], minShiftLength: 8, maxShiftLength: 16 },
    ];
    const day = { requirements: [], availability: {}, pinnedAssignments: [], solution: null };
    const fetch = vi.fn(async (url: string) => {
      if (url === "/api/employees") return new Response(JSON.stringify({ employees }));
      if (url === "/api/days/2026-09-10") return new Response(JSON.stringify({ day }));
      throw new Error(`unexpected URL: ${url}`);
    });

    const result = await load({ fetch, params: { date: "2026-09-10" } } as never);

    expect(result).toEqual({ date: "2026-09-10", employees, day });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch).toHaveBeenCalledWith("/api/employees", undefined);
    expect(fetch).toHaveBeenCalledWith("/api/days/2026-09-10", undefined);
  });
});
