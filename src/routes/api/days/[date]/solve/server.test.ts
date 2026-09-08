import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { SLOT_COUNT } from "../../../../../lib/domain/shift";
import { resetToSeed } from "../../../../../lib/server/db/reset";
import { replaceAllEmployees } from "../../../../../lib/server/db/employees";
import { saveDay, createDay } from "../../../../../lib/server/db/days";
import { POST } from "./+server";

function emptyRequirements() {
  return Array.from({ length: SLOT_COUNT }, () => ({ hall: 0, hot: 0, cold: 0, dishwashing: 0 }));
}

// 工程3（`$lib/solver`）はまだ無いので、テストでは fake の ScheduleSolver を注入する
// （契約: 「ScheduleSolver を引数で受け取ってテストでは fake を渡してください」）。
// `solve` は Promise を返す（契約訂正: wasm ロードを伴うため非同期）。
function makeFakeSolver(solution: unknown) {
  return { solve: () => Promise.resolve(solution) };
}

function makeEvent(
  date: string,
  request: Request,
  scheduleSolver: { solve: () => Promise<unknown> },
) {
  return {
    params: { date },
    request,
    locals: { scheduleSolver },
    platform: { env },
  } as unknown as Parameters<typeof POST>[0];
}

describe("POST /api/days/[date]/solve (実 D1 / workerd)", () => {
  it("固定割当とソルバー出力の両方を含む結果を保存し、返す", async () => {
    await resetToSeed(env.DB);
    await replaceAllEmployees(env.DB, [
      { id: "alice", name: "アリス", roles: ["hall"], minShiftLength: 8, maxShiftLength: 16 },
    ]);
    await createDay(env.DB, "2099-04-01");
    await saveDay(env.DB, "2099-04-01", {
      requirements: emptyRequirements(),
      availability: { alice: { start: 0, end: 10 } },
      pinnedAssignments: [],
      solution: null,
    });

    const pinnedAssignments = [{ employeeId: "alice", role: "hall", start: 0, length: 8 }];
    const solverSolution = {
      status: "optimal",
      objectiveValue: 3,
      assignments: [{ employeeId: "alice", role: "hall", start: 0, length: 8 }],
      shortages: [],
    };

    const response = await POST(
      makeEvent(
        "2099-04-01",
        new Request("http://localhost/api/days/2099-04-01/solve", {
          method: "POST",
          body: JSON.stringify({ pinnedAssignments }),
        }),
        makeFakeSolver(solverSolution),
      ),
    );

    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      day: { pinnedAssignments: unknown; solution: unknown };
    };
    expect(body.day.pinnedAssignments).toEqual(pinnedAssignments);
    expect(body.day.solution).toEqual(solverSolution);
  });

  it("不正な date は 400 を返す", async () => {
    const response = await POST(
      makeEvent(
        "not-a-date",
        new Request("http://localhost/api/days/not-a-date/solve", {
          method: "POST",
          body: JSON.stringify({ pinnedAssignments: [] }),
        }),
        makeFakeSolver({ status: "optimal", objectiveValue: 0, assignments: [], shortages: [] }),
      ),
    );

    expect(response.status).toBe(400);
  });

  it("不正な body は 400 を返す", async () => {
    await resetToSeed(env.DB);

    const response = await POST(
      makeEvent(
        "2099-04-02",
        new Request("http://localhost/api/days/2099-04-02/solve", {
          method: "POST",
          body: JSON.stringify({ pinnedAssignments: [{ role: "not-a-role" }] }),
        }),
        makeFakeSolver({ status: "optimal", objectiveValue: 0, assignments: [], shortages: [] }),
      ),
    );

    expect(response.status).toBe(400);
  });
});
