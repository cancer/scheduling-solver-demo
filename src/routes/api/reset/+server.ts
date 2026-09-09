import { json } from "@sveltejs/kit";
import { resetToSeed } from "../../../lib/server/db/reset";
import { withErrorHandling } from "../../../lib/server/http/handle";
import type { RequestHandler } from "./$types";

export const POST: RequestHandler = ({ platform }) =>
  withErrorHandling(async () => {
    await resetToSeed(platform!.env.DB);
    return json({ ok: true });
  });
