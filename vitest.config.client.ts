import { fileURLToPath } from "node:url";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { svelteTesting } from "@testing-library/svelte/vite";
import { defineConfig } from "vitest/config";

// `.svelte` コンポーネントと、workerd を要しない純粋な TypeScript（`src/poc/` を含む）を
// jsdom 環境で実行するプロジェクト。`src/**/server.test.ts`（`+server.ts` 用、
// workerd 側の vitest.config.workers.ts が引き取る）はここでは除外する。
//
// このプロジェクトは SvelteKit 本体の vite プラグイン（`sveltekit()`）を使わず、
// 素の `svelte()` だけを使う。`$lib` エイリアスは SvelteKit のプラグインが解決するため、
// `.svelte` が `$lib/...` を import してもここでは解決できない。テスト対象になる
// `.svelte` は `$lib` を使うので、同じエイリアスをここでも手で解決する。
export default defineConfig({
  plugins: [svelte(), svelteTesting()],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL("./src/lib", import.meta.url)),
    },
  },
  test: {
    name: "client",
    environment: "jsdom",
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/server.test.ts"],
  },
});
