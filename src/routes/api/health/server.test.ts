import { describe, expect, it } from "vitest";
import { GET } from "./+server";

describe("GET /api/health", () => {
  it("responds with an ok status as json", async () => {
    const response = GET();
    const body = await response.json();

    expect(body).toEqual({ status: "ok" });
  });
});
