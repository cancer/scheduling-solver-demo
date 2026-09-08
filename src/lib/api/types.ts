// API がやり取りする従業員データの形。`src/lib/server/db/employees.ts` の
// `StoredEmployee`（工程2）と構造的に同じ（`Employee` から `availability` を
// 除いたもの）。`src/lib/server/*` はサーバー専用でクライアントコードから
// import できない（SvelteKit が `$lib/server/*` のクライアント側 import を
// ビルドエラーにする）ため、`$lib/server` の代わりに `$lib/domain/shift`
// （クライアント・サーバーどちらからも import できる唯一の定義）を re-export する。
export type { StoredEmployee } from "../domain/shift";
