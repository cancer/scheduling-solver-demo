import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

// `.svelte` コンポーネントと、workerd を要しない純粋な TypeScript（`src/poc/` を含む）を
// jsdom 環境で実行するプロジェクト。`src/routes/**/server.test.ts`（`+server.ts` 用、
// workerd 側の vitest.config.workers.ts が引き取る）はここでは除外する。
export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  test: {
    name: "client",
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    exclude: ["src/routes/**/server.test.ts"],
  },
});
