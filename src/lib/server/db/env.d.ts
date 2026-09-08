// `cloudflare:workers` の `env` / `cloudflare:test` の型が参照する `Cloudflare.Env`
// を、この Worker のバインディングに合わせて宣言する。
//
// `DB` は製品の D1 バインディング（`wrangler.jsonc` / `wrangler.test.jsonc` の
// `d1_databases[].binding`。`src/app.d.ts` の `App.Platform.env.DB` と同じ実体）。
// `TEST_MIGRATIONS` はテスト専用で、`vitest.config.workers.ts` が
// `miniflare.bindings` 経由で注入する（本番の wrangler 設定には無い）。
declare namespace Cloudflare {
  interface Env {
    DB: D1Database;
    TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
  }
}
