import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

// `+server.ts` と D1 アクセスを、実際の workerd 上で検証するプロジェクト。
// Cloudflare の Vitest 統合は custom environment を設定できないため（known-issues参照）、
// `test.environment` はここでは指定しない。
//
// テストファイル名は `+server.test.ts` にはできない。SvelteKit のルートスキャナは
// `src/routes/` 配下で `+` から始まるファイル名を予約済み規約（+page/+layout/+server/+error
// など）として扱い、それ以外は `svelte-kit sync` がエラーで落ちる。そのため `+` を外した
// `server.test.ts` という名前を使う。この規約はファイル名についてのものであり、
// 置き場所は `src/routes/` 配下に限らない（D1 アクセスのテストが `src/lib` 配下に
// 来ても、`server.test.ts` という名前であればここで拾う）。
export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: { configPath: "./wrangler.test.jsonc" },
    }),
  ],
  test: {
    name: "workers",
    include: ["src/**/server.test.ts"],
  },
});
