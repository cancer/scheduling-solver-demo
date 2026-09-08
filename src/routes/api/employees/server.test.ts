import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { resetToSeed } from "../../../lib/server/db/reset";
import { GET, PUT } from "./+server";

function makeEvent(request: Request) {
  return { request, platform: { env } } as unknown as Parameters<typeof PUT>[0];
}

describe("GET/PUT /api/employees (実 D1 / workerd)", () => {
  it("PUT で保存した従業員一覧を GET で取得できる", async () => {
    await resetToSeed(env.DB);
    const employees = [
      { id: "alice", name: "アリス", roles: ["hall"], minShiftLength: 8, maxShiftLength: 12 },
    ];

    const putResponse = await PUT(
      makeEvent(
        new Request("http://localhost/api/employees", {
          method: "PUT",
          body: JSON.stringify({ employees }),
        }),
      ),
    );
    expect(putResponse.status).toBe(200);
    expect(await putResponse.json()).toEqual({ employees });

    const getResponse = await GET(makeEvent(new Request("http://localhost/api/employees")));
    expect(await getResponse.json()).toEqual({ employees });
  });

  it("不正な body には 400 と { error } を返す", async () => {
    const response = await PUT(
      makeEvent(
        new Request("http://localhost/api/employees", {
          method: "PUT",
          body: JSON.stringify({ employees: [{ id: "alice", roles: ["not-a-role"] }] }),
        }),
      ),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(typeof body.error).toBe("string");
  });

  it("壊れた JSON の body には 400 と { error } を返す", async () => {
    const response = await PUT(
      makeEvent(new Request("http://localhost/api/employees", { method: "PUT", body: "not-json" })),
    );

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string };
    expect(typeof body.error).toBe("string");
  });
});
