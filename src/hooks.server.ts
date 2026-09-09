import type { Handle } from "@sveltejs/kit";
import { getScheduleSolver } from "./lib/server/solver";

// `App.Locals.scheduleSolver`（`src/app.d.ts`、工程4が型だけ宣言）と、実 HiGHS を
// 読み込む唯一の入口 `getScheduleSolver`（`src/lib/server/solver.ts`、工程3）を
// 繋ぐ配線。どちらの工程の契約にも配線の担当が明記されていなかったため、
// 統合時にここで新規に行う。
export const handle: Handle = ({ event, resolve }) => {
  event.locals.scheduleSolver = getScheduleSolver();
  return resolve(event);
};
