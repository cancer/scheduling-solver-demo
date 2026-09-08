# scheduling-solver-demo

数理最適化ソルバーのデモを行う Web アプリケーション。題材は店舗・飲食スタッフの1日シフト管理
（従業員・必要人数・出勤可能時間帯の入力、求解、割当結果の閲覧、ピン留めしての再求解）である。
実運用のシステムではない。要件は `docs/requirements.md` にある。

## 構成

SvelteKit + `@sveltejs/adapter-cloudflare` で、Cloudflare Workers 上に構築する。API は
SvelteKit の `+server.ts` で実装し、保存には D1 をプラットフォームバインディング（`platform.env`）
経由で使う。主ソルバーは npm `highs`（HiGHS WASM）で、Worker 上で LP/MPS テキストを解く。

ビルド対象は `src/` 配下（`src/routes/`・`src/lib/`・`src/poc/`）で、エントリは
`@sveltejs/adapter-cloudflare` が `svelte.config.js` の設定に従って生成する
（`vite build` → `.svelte-kit/cloudflare/_worker.js`）。旧 Vite `vanilla-ts` の
`index.html` / `src/main.ts` は削除済みである。

`src/lib` にロジックを寄せる方針を取る。`.svelte` コンポーネントには表示とイベント配線だけを
持たせ、実際の計算・判定ロジックは `src/lib` の純関数に書く。この方針は lint 等で機械的に
強制できないため、レビューで守る。

## Worker 設定ファイルは3つある

- `wrangler.jsonc`（デフォルト名。製品 Worker）: `main` は
  `.svelte-kit/cloudflare/_worker.js`（ビルド生成物）。`npx wrangler dev` /
  `npx wrangler deploy` はこのファイルを既定で読む（`-c` 不要）。
- `wrangler.poc.jsonc`（PoC。以下参照）: `main` は `src/poc/worker.ts`。呼び出す際は必ず
  `-c ./wrangler.poc.jsonc` を指定する。
- `wrangler.test.jsonc`（`vitest.config.workers.ts` 専用）: `main` を持たない、
  `compatibility_date` / `compatibility_flags` だけの設定。理由は「2系統のテスト環境」の
  workers プロジェクトの節を参照。`wrangler dev` / `wrangler deploy` から直接使うことは
  想定していない。

3つを混同しない。製品 Worker の `main` に PoC のエントリを指定してはならず、
`wrangler.poc.jsonc` の `main` を変更してもいけない。

## 検査コマンド

| コマンド               | 挙動                                                          |
| ---------------------- | ------------------------------------------------------------- |
| `npm run lint`         | 非破壊。ファイルを書き換えない                                |
| `npm run lint:fix`     | **破壊的**。ファイルを書き換える                              |
| `npm run format:check` | 非破壊                                                        |
| `npm run format`       | **破壊的**。Markdown も整形対象に含む                         |
| `npm run typecheck`    | 非破壊（`svelte-kit sync && svelte-check ...`）               |
| `npm test`             | テスト実行（`vitest run`。watch ではない）                    |
| `npm run coverage`     | テスト実行 + カバレッジ出力（`coverage/coverage-final.json`） |

キー名からは破壊的かどうかが読めないので、ここに明記する。CI（`.github/workflows/quality.yml`）は
非破壊側だけを実行する（`lint` / `format:check` / `typecheck` / `coverage`。`coverage` が
テスト実行を兼ねるため、CI に単独の `test` ステップは無い）。

`npm run format` が Markdown も整形する点に注意する。ドキュメントを追加・編集したあとに
`format:check` が落ちるのはこのためで、`npm run format` を一度走らせれば戻る。

`npm run typecheck` は `.svelte` ファイルの `<script>` 内部を含めて型検査する。素の `tsc` は
`.svelte` を任意モジュールとして扱うだけで内部は検査できないため、`svelte-check` を使っている。

## 2系統のテスト環境

Vitest のプロジェクトを2つに分けている（設定は `vitest.config.ts` が
`vitest.config.client.ts` / `vitest.config.workers.ts` を束ねる形）。

- **client**（`vitest.config.client.ts`）: `jsdom` 環境。`.svelte` コンポーネントのテストと、
  workerd を要しない純粋な TypeScript（`src/poc/` を含む）はここで動く。
  `@testing-library/svelte` の `svelteTesting()` プラグインが、jsdom 環境での動作に必要な
  `resolve.conditions` の `browser` 追加とテスト後の自動クリーンアップを行う。SvelteKit 本体の
  vite プラグイン（`sveltekit()`）は使わず素の `svelte()` だけを使っているため、`$lib`
  エイリアスは自動解決されない。`.svelte` が `$lib/...` を import するテストのために、
  `resolve.alias` で `$lib` を `src/lib` へ手動で解決している。
- **workers**（`vitest.config.workers.ts`）: `@cloudflare/vitest-plugin` の `cloudflareTest()`
  による実 workerd 環境。`+server.ts` と、将来の D1 アクセスのテストはここで動く。Cloudflare
  の Vitest 統合はカスタム `environment` を設定できないため
  （<https://developers.cloudflare.com/workers/testing/vitest-integration/configuration/>
  の "Custom Vitest environments or runners are not supported"）、このプロジェクトには
  `test.environment` を書かない。`wrangler.configPath` には製品用の `wrangler.jsonc` では
  なく専用の `wrangler.test.jsonc` を渡している。製品側の `main`
  （`.svelte-kit/cloudflare/_worker.js`）は未ビルド時に存在せず、`cloudflareTest()` が
  起動のたびにこれを解決しようとして警告を出し続けるため
  （`Failed to statically analyze the exports of the main Worker entry-point`）、
  `main` を持たない `wrangler.test.jsonc` に切り離して警告を消した。

**`include` はファイル名 `server.test.ts` にマッチさせているだけで、置き場所は
`src/routes/` 配下に限らない。** D1 アクセスのテストが `src/lib` 配下に来ても、
`server.test.ts` という名前であれば workers プロジェクトが拾う。

**`+server.ts` に対応するテストファイルは `+server.test.ts` にできない。** SvelteKit の
ルートスキャナは `src/routes/` 配下で `+` から始まるファイル名を予約済み規約
（`+page` / `+layout` / `+server` / `+error` など）として扱い、それ以外だと
`svelte-kit sync`（`typecheck` が内部で呼ぶ）がエラーで落ちる。そのため `+` を外した
`server.test.ts` を同じフォルダに置き、`./+server` を import する
（例: `src/routes/api/health/server.test.ts`）。同じ理由で `+page.svelte` のテストも
`+page.test.ts` にはできず、`page.test.ts` と命名する（`src/routes/page.test.ts`）。

`.svelte` ファイルの単体テストは、`@testing-library/svelte` の `render` / `screen` /
`fireEvent` を使う（`@testing-library/user-event` は devDependency に入れていないので、
イベント発火には `fireEvent` を使う）。

## カバレッジ

### provider を v8 から Istanbul へ替えた理由

Cloudflare の Vitest 統合は v8 カバレッジ provider を未サポートで、Istanbul を使う必要がある
（<https://developers.cloudflare.com/workers/testing/vitest-integration/known-issues/>
の "Native code coverage via V8 is not supported. You must use instrumented code coverage
via Istanbul instead."）。2プロジェクト構成にした時点で、workers 側がこの制約を受けるため、
プロジェクト全体で provider を Istanbul に統一した。

### 実測結果: Istanbul は `.svelte` の分岐カバレッジを検出する

`src/lib/components/Counter.svelte` に、3回クリックしたときだけ到達する分岐
（`if (count >= 3) { message = ... }`）を作り、1回クリックのテストだけを置いた状態で
`npm run coverage` を実行したところ、その分岐が実際に未到達として計測された
（`Counter.svelte` の branch カバレッジが 50% に低下）。Istanbul provider は `.svelte`
コンポーネントの分岐カバレッジを実効的に測定できることを確認している。その後、3回クリックする
テストを追加し、分岐を含めて全体を 100% に戻した（ハンドラは削除せず、テストで埋めた）。

### 実測結果: `coverage-final.json` は2系統を1つに集約する

`coverage/coverage-final.json` を開き、client 側（`src/lib/components/Counter.svelte` や
`src/poc/*.ts`）と workers 側（`src/routes/api/health/+server.ts`）の両方のファイルが
同じ JSON に含まれることを確認した。閾値90はこの集約後の「All files」に対して判定される。

### `coverage.include` に関する制約（実測）

閾値は `package.json` の `coverage` スクリプトのコマンドラインにある（設定ファイルではない）。
同じスクリプトの `--coverage.include=src/**` を**外してはいけない**。vitest 4 は `coverage.all`
が廃止されており、この指定が無いとテストから import されたファイルだけが計測対象になる。外すと、
テストの無いファイルを追加しても分母に載らず、閾値が作動しなくなる。

`coverage.include` / `coverage.exclude` はプロジェクトごとではなく全体で1つだけ有効になる
（`vitest.config.client.ts` / `vitest.config.workers.ts` の `test.coverage` に書いても
無視され、CLI 引数の値がそのまま使われることを実測で確認した）。そのため `src/app.html`
（SvelteKit のテンプレート HTML）だけを `--coverage.exclude` として追加している。
どのテストからも import されない HTML は vitest の「未カバーファイルの静的解析」パスに乗るが、
HTML を JS として解析しようとして構文エラーで落ちる。`.svelte` にはこの対処をしていない
（理由は次項）。

**`.svelte` はどのテストからも import されない状態を作らない。** 「未カバーファイルの
静的解析」パスは、テストされない `.svelte` を svelte プラグインを経由しない変換にかけて
構文エラーで落とす（実際に、どのテストからも import していなかった `src/routes/+page.svelte`
で発生した）。一方、テストから import される `.svelte`（`src/lib/components/Counter.svelte`
等）はテスト実行時に client プロジェクトの svelte プラグインを通るため問題なく計測できる。
決定5（`.svelte` をカバレッジの分母に残し、画面側の配線を検証する）を成立させるため、
`.svelte` を `coverage.exclude` で外すのではなく、**どの `.svelte` にも最低1つは import
するテストを置く**ことで対処する。`+page.svelte` には `src/routes/page.test.ts` を追加し、
render して見出しとボタンの存在を確認するテストを置いた。今後 `src/routes/` 配下に増える
画面の `.svelte` も、同様に最低1つのテストを添える。

## テストの評価

カバレッジ・実行結果のレポートを使ったテストのレビューは `~/.claude/skills/test-review/SKILL.md` の
手順で行う。`npm run coverage` が出す `coverage/coverage-final.json` をそのまま `--coverage-json` に
渡せる（client / workers 両方のファイルを含む集約済みの JSON である）。

ミューテーションテストは**導入していない**。品質検査は6項目
（テスト実行・型検査・lint・format・カバレッジ出力・CI）であり、ミューテーションはそこに含めない
（`~/.claude/skills/init-project/SKILL.md`）。価値を否定しての除外ではないので、実装が積まれた
時点で導入を再検討する。

## src/ の現状

- `src/routes/+page.svelte`: 最小のトップページ。`src/lib/components/Counter.svelte` を配置する。
  テストは `src/routes/page.test.ts`（`+page.test.ts` にできない理由は前述）。
- `src/lib/components/Counter.svelte`: 動作確認用の最小コンポーネント。ロジックは
  `src/lib` へ寄せる方針の暫定的な置き場であり、実装が進んだら実データを扱うコンポーネントへ
  差し替わる。
- `src/routes/api/health/+server.ts`: workers プロジェクトを成立させるための最小 API。
  D1 スキーマの設計・投入は工程2の範囲であり、ここでは扱わない。
- `src/app.html` / `src/app.d.ts`: SvelteKit の規約ファイル。`app.d.ts` の `Platform.env.DB` は
  D1 バインディングの型で、`@cloudflare/workers-types` の `D1Database` を参照する
  （実体のスキーマは工程2で決める）。

`src/poc/` は SvelteKit 導入前に、Cloudflare Workers 上で HiGHS WASM を動かせるか測る PoC で
あり、SvelteKit 化後も再現用ハーネスとして残している。製品 Worker（`wrangler.jsonc` /
`src/routes/`）とは別物であり、混同しない。Worker のエントリは `wrangler.poc.jsonc` の `main`
である `src/poc/worker.ts` とし、ローカル実行とデプロイは次で行う。

```sh
npx wrangler dev -c ./wrangler.poc.jsonc
npx wrangler deploy -c ./wrangler.poc.jsonc
```

Worker エントリは静的 `.wasm` import と `instantiateWasm` フックの配線だけに保つ。Node の Vitest では
workerd 上の実 WASM 経路を実行しないため、このエントリの数行はカバレッジで未到達になり得る。テスト可能な
ロジックを `src/poc/` の依存注入された純粋なモジュールへ出し、未到達面積を小さくする設計意図である。
`src/poc/` のテストは client プロジェクト（jsdom）で動く。jsdom は Node の上に DOM グローバルを
足すだけなので、DOM を使わない PoC のロジックには影響しない。

## テストの置き場所

SvelteKit 導入により、型検査の対象は `tsconfig.json` が `extends` する
`.svelte-kit/tsconfig.json`（`svelte-kit sync` が生成する）の `include` が決める。ここには
`src/**/*.ts` 等に加えて `test/**` `tests/**` も含まれるが、当プロジェクトでは従来どおり
テストを `src/` 配下に置く（`*.test.ts`。ただし `+server.ts` 用は前述のとおり `+` を外した
`server.test.ts`）。

## 開発の進め方

以下のスキルを読み、その手順に従う（本文はコピーしない。スキル側の更新に追随させるため）。

- 実装依頼の入口: `~/.claude/skills/dev-workflow/SKILL.md`
- 実装時の共通方針: `~/.claude/skills/write-code/SKILL.md`
- テストの書き方: `~/.claude/skills/test-driven-development/SKILL.md`
- PR 作成: `~/.claude/skills/create-pr/SKILL.md`
