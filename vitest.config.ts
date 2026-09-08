import { defineConfig } from "vitest/config";

// 2系統のプロジェクトを束ねるだけの入口。設定の実体は各ファイルにある。
// - vitest.config.client.ts: `.svelte` コンポーネント用（jsdom）
// - vitest.config.workers.ts: `+server.ts` / D1 アクセス用（workerd）
export default defineConfig({
  test: {
    projects: ["./vitest.config.client.ts", "./vitest.config.workers.ts"],
  },
});
