import path from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// `+server.ts` と D1 アクセスを、実際の workerd 上で検証するプロジェクト。
// Cloudflare の Vitest 統合は custom environment を設定できないため（known-issues参照）、
// `test.environment` はここでは指定しない。
//
// テストファイル名の規約は置き場所で分かれる（工程2で見直し）。
// - `src/routes/` 配下: `+server.test.ts` にできない。SvelteKit のルートスキャナが
//   `src/routes/` 配下で `+` から始まるファイル名を予約済み規約（+page/+layout/+server/
//   +error など）として扱い、それ以外は `svelte-kit sync` がエラーで落ちるため、
//   `+` を外した `server.test.ts` を使う。1ディレクトリに複数の `+server.ts` は
//   置かない（SvelteKit のルート規約上、1ルートに1つ）ので、この命名で困らない。
// - それ以外（`src/lib` 配下など）: `+` の制約が無い。`server.test.ts` 固定だと
//   1ディレクトリに workerd テストを1本しか置けず、D1 アクセス層のように複数の
//   モジュールを同じディレクトリに置く構成と噛み合わない。そのため `*.workerd.test.ts`
//   という自然な名前を許可し、複数本を置けるようにする。
//   例: `src/lib/server/db/employees.workerd.test.ts`。
//
// `vitest.config.client.ts` の `exclude` も同じ2パターンで揃えている（両プロジェクトが
// 同じファイルを二重に拾わないようにするため）。
export default defineConfig(async () => {
  // マイグレーションは Node.js 側で読み、`miniflare.bindings` 経由でテスト専用の
  // バインディング（TEST_MIGRATIONS）として workerd 側へ渡す。実際の適用は
  // `src/lib/server/db/apply-migrations.ts`（setupFiles）が `cloudflare:test` の
  // `applyD1Migrations` で行う。
  // 出典: https://developers.cloudflare.com/workers/testing/vitest-integration/test-apis/
  // （`readD1Migrations()` の呼び出し場所・`applyD1Migrations()` のシグネチャ）。
  // ここでの具体的な配線（`miniflare.bindings` に渡す形、setupFiles の実装）は
  // ドキュメント本文には無く、cloudflare/workers-sdk リポジトリの公式サンプル
  // `fixtures/vitest-plugin-examples/d1/vitest.config.ts` を実行環境（インストール済みの
  // `@cloudflare/vitest-plugin@1.1.4`）で動作確認した上で採用している。
  const migrationsPath = path.join(import.meta.dirname, "migrations");
  const migrations = await readD1Migrations(migrationsPath);

  return {
    plugins: [
      cloudflareTest({
        wrangler: { configPath: "./wrangler.test.jsonc" },
        miniflare: {
          bindings: { TEST_MIGRATIONS: migrations },
        },
      }),
    ],
    test: {
      name: "workers",
      include: ["src/routes/**/server.test.ts", "src/**/*.workerd.test.ts"],
      setupFiles: ["./src/lib/server/db/apply-migrations.ts"],
    },
  };
});
