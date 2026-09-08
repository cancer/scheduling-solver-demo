import { json } from "@sveltejs/kit";
import { listEmployees, replaceAllEmployees } from "../../../lib/server/db/employees";
import { parseEmployeesRequestBody } from "../../../lib/server/http/employees";
import { withErrorHandling } from "../../../lib/server/http/handle";
import { readJsonBody } from "../../../lib/server/http/json-body";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = ({ platform }) =>
  withErrorHandling(async () => {
    const employees = await listEmployees(platform!.env.DB);
    return json({ employees });
  });

export const PUT: RequestHandler = ({ request, platform }) =>
  withErrorHandling(async () => {
    const employees = parseEmployeesRequestBody(await readJsonBody(request));
    await replaceAllEmployees(platform!.env.DB, employees);
    return json({ employees });
  });
