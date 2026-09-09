import path from "node:path";
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";
import type { Plugin } from "vite";

// vite/rolldown は `.wasm` を ES module として解決できない。実 `.wasm`
// （`src/lib/server/solver.ts`）は wrangler 側の `CompiledWasm` rule
// （`wrangler.jsonc`）が解決する前提のため、vite のビルドでは解決させず
// import 文をそのまま残す（external 化する）。
//
// `resolveId` で external 化するだけでは、vite の SSR ビルドが node_modules 配下の
// external を「Node.js の `require` 解決に任せるベア指定子」へ書き換えてしまい
// （`node_modules/` が消え、深さもずれる）、wrangler が相対パスとして解決できず
// ENOENT になる。node_modules を示す文字列を一切含まない一時的な id（プレフィックス
// 付き）で external 化し、vite にそのパス書き換えを行わせないようにした上で、
// `renderChunk` で出力先チャンクの位置から見た正しい相対パスに自前で置き換える。
const WASM_EXTERNAL_PREFIX = "wasm-external:";

function externalWasm(): Plugin {
  return {
    name: "external-wasm",
    enforce: "pre",
    resolveId(source, importer) {
      if (!source.endsWith(".wasm")) return null;
      const absolutePath = path.resolve(path.dirname(importer ?? ""), source);
      return { id: WASM_EXTERNAL_PREFIX + absolutePath, external: true };
    },
    renderChunk(code, chunk, options) {
      if (!code.includes(WASM_EXTERNAL_PREFIX)) return null;
      const outDir = path.resolve(options.dir ?? path.dirname(options.file ?? "."));
      const chunkDir = path.dirname(path.join(outDir, chunk.fileName));
      const pattern = new RegExp(`${WASM_EXTERNAL_PREFIX}([^"'\`]+)`, "g");
      const replaced = code.replace(pattern, (_match, absolutePath: string) => {
        const relative = path.relative(chunkDir, absolutePath).split(path.sep).join("/");
        return relative.startsWith(".") ? relative : `./${relative}`;
      });
      return { code: replaced, map: null };
    },
  };
}

export default defineConfig({
  plugins: [sveltekit(), externalWasm()],
});
