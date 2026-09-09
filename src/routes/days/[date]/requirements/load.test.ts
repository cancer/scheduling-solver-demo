import { describe, expect, it, vi } from "vitest";
import { load } from "./+page";

describe("requirements page load", () => {
  it("returns the requested date data without an API client", async () => {
    const day = {
      requirements: [],
      availability: {},
      pinnedAssignments: [],
      solution: null,
    };
    const fetch = vi.fn(async () => new Response(JSON.stringify({ day })));

    const result = await load({ fetch, params: { date: "2026-09-08" } } as never);

    expect(result).toEqual({ date: "2026-09-08", day });
    expect(fetch).toHaveBeenCalledWith("/api/days/2026-09-08", undefined);
  });
});
