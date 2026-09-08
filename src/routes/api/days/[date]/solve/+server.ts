import { json } from "@sveltejs/kit";
import { createDay, getDay, saveDay } from "../../../../../lib/server/db/days";
import { listEmployees } from "../../../../../lib/server/db/employees";
import { parseDateParam } from "../../../../../lib/server/http/date";
import { parseSolveRequestBody } from "../../../../../lib/server/http/days";
import { withErrorHandling } from "../../../../../lib/server/http/handle";
import { readJsonBody } from "../../../../../lib/server/http/json-body";
import { applySolution, buildSolveInput } from "../../../../../lib/server/solve-day";
import type { RequestHandler } from "./$types";

// 求解要求の重なりに順序保証を入れない（契約 決定7）。バージョンも保存直前の
// 照合も持たないため、後発の求解が先発を追い越して先に保存された場合、
// 先発の求解が後から完了すると先発の古い結果で新しい結果を上書きしうる。
// これは沈黙ではなく「対処しない」という決定であり、実装漏れではない。
export const POST: RequestHandler = ({ params, request, locals, platform }) =>
  withErrorHandling(async () => {
    const date = parseDateParam(params.date);
    const pinnedAssignments = parseSolveRequestBody(await readJsonBody(request));
    const db = platform!.env.DB;

    await createDay(db, date);
    const day = await getDay(db, date);
    if (day === null) {
      throw new Error(`day が作成直後に見つからない: ${date}`);
    }
    const employees = await listEmployees(db);

    const solveInput = buildSolveInput({ employees, day, pinnedAssignments });
    const solution = locals.scheduleSolver.solve(solveInput);
    const updatedDay = applySolution(day, pinnedAssignments, solution);

    await saveDay(db, date, updatedDay);
    return json({ day: updatedDay });
  });
