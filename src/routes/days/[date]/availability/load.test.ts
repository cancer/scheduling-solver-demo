import { describe, expect, it, vi } from "vitest";
import { load } from "./+page";

describe("availability page load", () => {
  it("returns both employees and the requested date data", async () => {
    const employees = [
      { id: "e1", name: "アリス", roles: ["hall"], minShiftLength: 8, maxShiftLength: 16 },
    ];
    const day = { requirements: [], availability: {}, pinnedAssignments: [], solution: null };
    const fetch = vi.fn(
      async (url: string) =>
        new Response(JSON.stringify(url.endsWith("employees") ? { employees } : { day })),
    );

    const result = await load({ fetch, params: { date: "2026-09-08" } } as never);

    expect(result).toEqual({ date: "2026-09-08", employees, day });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
