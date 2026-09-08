import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { SEED_EMPLOYEES } from "../../../lib/server/db/seed";
import { replaceAllEmployees, listEmployees } from "../../../lib/server/db/employees";
import { POST } from "./+server";

function makeEvent() {
  return { platform: { env } } as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/reset (実 D1 / workerd)", () => {
  it("編集後に呼ぶと全データが seed 状態へ戻る", async () => {
    await replaceAllEmployees(env.DB, []);

    const response = await POST(makeEvent());

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(await listEmployees(env.DB)).toEqual(
      SEED_EMPLOYEES.toSorted((a, b) => a.id.localeCompare(b.id)),
    );
  });
});
