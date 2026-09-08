import type { Employee } from "../domain/shift";

// API がやり取りする従業員データの形。`src/lib/server/db/employees.ts` の
// `StoredEmployee`（工程2）と構造的に同じ（`Employee` から `availability` を
// 除いたもの）だが、`src/lib/server/*` はサーバー専用でクライアントコードから
// import できない（SvelteKit が `$lib/server/*` のクライアント側 import を
// ビルドエラーにする）ため、同じ形をここで独立に定義する。JSON でやり取りする
// 構造的な型なので、定義箇所が2つあっても値の互換性は保たれる。
export type StoredEmployee = Omit<Employee, "availability">;
