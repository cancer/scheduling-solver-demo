// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      // `POST /api/days/[date]/solve` が使う求解の実体。工程3
      // （`$lib/solver/solve` の `createScheduleSolver`）が確定するまでは
      // 型だけの参照であり、`hooks.server.ts` 等でこれを注入する配線は
      // 本工程（工程4）では行っていない（契約に配線の担当が明記されて
      // いないため。工程4の報告でチームリードへ確認を求めている）。
      scheduleSolver: import("$lib/solver/solve").ScheduleSolver;
    }
    // interface PageData {}
    // interface PageState {}
    interface Platform {
      env: {
        DB: D1Database;
      };
    }
  }
}

export {};
