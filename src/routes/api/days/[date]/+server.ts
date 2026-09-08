import { json } from "@sveltejs/kit";
import { createDay, getDay, saveDay } from "../../../../lib/server/db/days";
import { parseDateParam } from "../../../../lib/server/http/date";
import { parseDayRequestBody } from "../../../../lib/server/http/days";
import { withErrorHandling } from "../../../../lib/server/http/handle";
import { readJsonBody } from "../../../../lib/server/http/json-body";
import type { RequestHandler } from "./$types";

// 未作成の日付は作成して空を返す（契約）。
export const GET: RequestHandler = ({ params, platform }) =>
  withErrorHandling(async () => {
    const date = parseDateParam(params.date);
    const db = platform!.env.DB;
    let day = await getDay(db, date);
    if (day === null) {
      await createDay(db, date);
      day = await getDay(db, date);
    }
    return json({ day });
  });

export const PUT: RequestHandler = ({ params, request, platform }) =>
  withErrorHandling(async () => {
    const date = parseDateParam(params.date);
    const day = parseDayRequestBody(await readJsonBody(request));
    const db = platform!.env.DB;
    // saveDay は日付が事前に作成されている前提のため、無ければ作ってから保存する。
    await createDay(db, date);
    await saveDay(db, date, day);
    return json({ day });
  });
