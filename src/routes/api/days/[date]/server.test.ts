import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { SLOT_COUNT } from "../../../../lib/domain/shift";
import { resetToSeed } from "../../../../lib/server/db/reset";
import { GET, PUT } from "./+server";

function makeEvent(date: string, request: Request) {
  return { params: { date }, request, platform: { env } } as unknown as Parameters<typeof PUT>[0];
}

function emptyRequirements() {
  return Array.from({ length: SLOT_COUNT }, () => ({ hall: 0, hot: 0, cold: 0, dishwashing: 0 }));
}

describe("GET/PUT /api/days/[date] (実 D1 / workerd)", () => {
  it("未作成の日付は GET で作成され、空のデータが返る", async () => {
    await resetToSeed(env.DB);

    const response = await GET(
      makeEvent("2099-01-01", new Request("http://localhost/api/days/2099-01-01")),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      day: {
        requirements: emptyRequirements(),
        availability: {},
        pinnedAssignments: [],
        solution: null,
      },
    });
  });

  it("PUT で保存した内容を 2 日分保存し、片方だけ取得できる", async () => {
    await resetToSeed(env.DB);
    const dayA = {
      requirements: emptyRequirements(),
      availability: { "seed-hall-1": { start: 0, end: 10 } },
      pinnedAssignments: [{ employeeId: "seed-hall-1", role: "hall", start: 0, length: 8 }],
      solution: null,
    };
    const dayB = {
      requirements: emptyRequirements(),
      availability: {},
      pinnedAssignments: [],
      solution: null,
    };

    await PUT(
      makeEvent(
        "2099-02-01",
        new Request("http://localhost/api/days/2099-02-01", {
          method: "PUT",
          body: JSON.stringify({ day: dayA }),
        }),
      ),
    );
    await PUT(
      makeEvent(
        "2099-02-02",
        new Request("http://localhost/api/days/2099-02-02", {
          method: "PUT",
          body: JSON.stringify({ day: dayB }),
        }),
      ),
    );

    const responseA = await GET(
      makeEvent("2099-02-01", new Request("http://localhost/api/days/2099-02-01")),
    );
    expect(await responseA.json()).toEqual({ day: dayA });
  });

  it("不正な date は 400 を返す", async () => {
    const response = await GET(
      makeEvent("not-a-date", new Request("http://localhost/api/days/not-a-date")),
    );

    expect(response.status).toBe(400);
  });

  it("不正な body は 400 を返す", async () => {
    await resetToSeed(env.DB);

    const response = await PUT(
      makeEvent(
        "2099-03-01",
        new Request("http://localhost/api/days/2099-03-01", {
          method: "PUT",
          body: JSON.stringify({ day: { requirements: [] } }),
        }),
      ),
    );

    expect(response.status).toBe(400);
  });
});
