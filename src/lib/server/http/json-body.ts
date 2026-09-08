import { ValidationError } from "./errors";

/** リクエスト body を JSON として読む。壊れた JSON は 400 として扱う。 */
export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ValidationError("リクエストボディが JSON として解釈できない");
  }
}
