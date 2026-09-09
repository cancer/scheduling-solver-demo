import { describe, expect, it } from "vitest";
import { load } from "./+layout";

describe("date layout load", () => {
  it("passes the URL date to the layout", () => {
    expect(load({ params: { date: "2026-09-08" } } as never)).toEqual({
      date: "2026-09-08",
    });
  });
});
