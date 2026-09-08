import { applyD1Migrations } from "cloudflare:test";
import { env } from "cloudflare:workers";

// workers プロジェクト（vitest.config.workers.ts）の setupFiles から読み込まれる。
// setupFiles はストレージ隔離の外側で実行され、複数回呼ばれ得るが、
// `applyD1Migrations()` は未適用のマイグレーションだけを適用するため、
// ここで毎回呼んでも安全である（公式サンプルの注記に基づく。出典:
// https://developers.cloudflare.com/workers/testing/vitest-integration/test-apis/
// および cloudflare/workers-sdk リポジトリ
// `fixtures/vitest-plugin-examples/d1/test/apply-migrations.ts`）。
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
