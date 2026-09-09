import { describe, expect, it } from "vitest";
import type { RequestEvent } from "@sveltejs/kit";
import { handle } from "./hooks.server";
import { SLOT_COUNT } from "./lib/domain/shift";
import type { Employee } from "./lib/domain/shift";

// `handle` が `event.locals.scheduleSolver` を実際に埋め、その `scheduleSolver` が
// 実 HiGHS の wasm ビルドで求解できることを確かめる（配線の固定）。
// `getScheduleSolver` は実 `.wasm` を import する `$lib/server/solver` 経由のため、
// `.workerd.test.ts`（`vitest.config.workers.ts` が拾う）に置く。
describe("handle (実 wasm / workerd)", () => {
  it("event.locals.scheduleSolver を埋めて resolve を呼ぶ", async () => {
    const locals = {} as App.Locals;
    const event = { locals } as unknown as RequestEvent;
    let resolvedWith: RequestEvent | undefined;
    const resolve = (e: RequestEvent) => {
      resolvedWith = e;
      return Promise.resolve(new Response(null));
    };

    const response = await handle({ event, resolve } as Parameters<typeof handle>[0]);

    expect(resolvedWith).toBe(event);
    expect(response.status).toBe(200);
    expect(typeof locals.scheduleSolver.solve).toBe("function");
  });

  it("配線された scheduleSolver が実際に求解できる", async () => {
    const locals = {} as App.Locals;
    const event = { locals } as unknown as RequestEvent;
    await handle({
      event,
      resolve: () => Promise.resolve(new Response(null)),
    } as Parameters<typeof handle>[0]);

    const employees: readonly Employee[] = [
      {
        id: "a",
        name: "A",
        roles: ["hall"],
        availability: { start: 0, end: 8 },
        minShiftLength: 8,
        maxShiftLength: 8,
      },
    ];
    const requirements = Array.from({ length: SLOT_COUNT }, (_, slot) => ({
      hall: slot < 8 ? 1 : 0,
      hot: 0,
      cold: 0,
      dishwashing: 0,
    }));

    const solution = await locals.scheduleSolver.solve({
      employees,
      requirements,
      pinnedAssignments: [],
    });

    expect(solution.status).toBe("Optimal");
    expect(solution.assignments).toEqual([{ employeeId: "a", role: "hall", start: 0, length: 8 }]);
  });
});
