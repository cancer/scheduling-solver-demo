import { describe, expect, it, vi } from "vitest";
import { load } from "./+page";

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200 });
}

describe("employees page load", () => {
  it("creates an API client from the load event fetch and returns employees only", async () => {
    const fetch = vi.fn(async () =>
      jsonResponse({
        employees: [
          { id: "e1", name: "アリス", roles: ["hall"], minShiftLength: 8, maxShiftLength: 16 },
        ],
      }),
    );

    const result = await load({ fetch } as never);

    expect(result).toEqual({
      employees: [
        { id: "e1", name: "アリス", roles: ["hall"], minShiftLength: 8, maxShiftLength: 16 },
      ],
    });
    expect(fetch).toHaveBeenCalledWith("/api/employees", undefined);
  });
});
