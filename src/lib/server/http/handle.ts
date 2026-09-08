import { json } from "@sveltejs/kit";
import { ValidationError } from "./errors";

// 契約「エラーは HTTP ステータス + { "error": "<説明>" }」を全エンドポイントで
// 揃えるための共通ラッパー。`+server.ts` を薄く保つため、判断（400 か 500 か）
// はここへ寄せる。
export async function withErrorHandling(run: () => Promise<Response>): Promise<Response> {
  try {
    return await run();
  } catch (error) {
    const status = error instanceof ValidationError ? 400 : 500;
    const message = error instanceof Error ? error.message : "unknown error";
    return json({ error: message }, { status });
  }
}
