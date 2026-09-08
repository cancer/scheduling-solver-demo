import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

import { listEmployees, replaceAllEmployees } from "./employees";

describe("employees repository (実 D1 / workerd)", () => {
  it("returns no employees before any are saved", async () => {
    expect(await listEmployees(env.DB)).toEqual([]);
  });

  it("round-trips employees through D1, including optional availability being absent", async () => {
    const alice = {
      id: "alice",
      name: "アリス",
      roles: ["hall", "dishwashing"] as const,
      minShiftLength: 8,
      maxShiftLength: 12,
    };
    const bob = {
      id: "bob",
      name: "ボブ",
      roles: ["hot"] as const,
      minShiftLength: 8,
      maxShiftLength: 16,
    };

    await replaceAllEmployees(env.DB, [alice, bob]);

    const stored = await listEmployees(env.DB);
    expect(stored).toEqual([alice, bob]);
  });

  it("replaces the previous set entirely rather than appending", async () => {
    await replaceAllEmployees(env.DB, [
      { id: "alice", name: "アリス", roles: ["hall"], minShiftLength: 8, maxShiftLength: 12 },
    ]);

    await replaceAllEmployees(env.DB, [
      { id: "carol", name: "キャロル", roles: ["cold"], minShiftLength: 8, maxShiftLength: 16 },
    ]);

    const stored = await listEmployees(env.DB);
    expect(stored.map((employee) => employee.id)).toEqual(["carol"]);
  });

  it("rejects a row whose roles_json holds a value outside ROLES on read", async () => {
    // このリポジトリの書き込み経路（replaceAllEmployees）は不正な role を作れないため、
    // 破損データを模して直接 SQL で挿入する。
    await env.DB.prepare(
      "INSERT INTO employees (id, name, roles_json, min_shift_length, max_shift_length) VALUES (?, ?, ?, ?, ?)",
    )
      .bind("broken", "壊れた行", JSON.stringify(["not-a-role"]), 8, 16)
      .run();

    await expect(listEmployees(env.DB)).rejects.toThrow(
      "employees.roles_json に想定外の値が入っている",
    );
  });
});
