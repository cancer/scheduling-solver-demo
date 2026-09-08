import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// `+server.ts` と D1 アクセスを、実際の workerd 上で検証するプロジェクト。
// Cloudflare の Vitest 統合は custom environment を設定できないため（known-issues参照）、
// `test.environment` はここでは指定しない。
//
// テストファイル名は `+server.test.ts` にはできない。SvelteKit のルートスキャナは
// `src/routes/` 配下で `+` から始まるファイル名を予約済み規約（+page/+layout/+server/+error
// など）として扱い、それ以外は `svelte-kit sync` がエラーで落ちる。そのため `+` を外した
// `server.test.ts` を同じフォルダに置き、`./+server` を import する。
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.jsonc" },
    }),
  ],
  test: {
    name: "workers",
    include: ["src/routes/**/server.test.ts"],
  },
});
