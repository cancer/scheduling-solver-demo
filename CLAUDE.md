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
  による実 workerd 環境。`+server.ts` と D1 アクセス（`src/lib/server/db/`）のテストはここで
  動く。Cloudflare の Vitest 統合はカスタム `environment` を設定できないため
  （<https://developers.cloudflare.com/workers/testing/vitest-integration/configuration/>
  の "Custom Vitest environments or runners are not supported"）、このプロジェクトには
  `test.environment` を書かない。`wrangler.configPath` には製品用の `wrangler.jsonc` では
  なく専用の `wrangler.test.jsonc` を渡している。製品側の `main`
  （`.svelte-kit/cloudflare/_worker.js`）は未ビルド時に存在せず、`cloudflareTest()` が
  起動のたびにこれを解決しようとして警告を出し続けるため
  （`Failed to statically analyze the exports of the main Worker entry-point`）、
  `main` を持たない `wrangler.test.jsonc` に切り離して警告を消した。

### テストファイルの命名規約（置き場所で分かれる。工程2で見直し）

workers プロジェクトの `include` は次の2パターンである（`vitest.config.workers.ts` に実体）。

- **`src/routes/` 配下**: `+server.test.ts` にできない。SvelteKit のルートスキャナは
  `src/routes/` 配下で `+` から始まるファイル名を予約済み規約
  （`+page` / `+layout` / `+server` / `+error` など）として扱い、それ以外だと
  `svelte-kit sync`（`typecheck` が内部で呼ぶ）がエラーで落ちる。そのため `+` を外した
  `server.test.ts` を同じフォルダに置き、`./+server` を import する
  （例: `src/routes/api/health/server.test.ts`）。同じ理由で `+page.svelte` のテストも
  `+page.test.ts` にはできず、`page.test.ts` と命名する（`src/routes/page.test.ts`）。
  1ルートに `+server.ts` は1つなので、この命名で1ディレクトリ1本の制約があっても困らない。
- **それ以外（`src/lib` 配下など）**: `+` の制約が無い。当初は `src/routes/` 側と同じ
  `server.test.ts` 固定にしていたが、D1 アクセス層（`src/lib/server/db/`）のように
  複数モジュールを同じディレクトリに置く構成では「1ディレクトリに workerd テストを1本しか
  置けない」という実態に合わない制約になっていた。工程2 で `*.workerd.test.ts` という
  自然な名前を許可する形に見直し、`src/lib/server/db/employees.workerd.test.ts` のように
  複数本を並べられるようにした。

`vitest.config.client.ts` の `exclude` もこの2パターンで揃えている。片方だけ変えると
どちらのプロジェクトにも拾われない（または両方に拾われる）テストファイルができるので、
`include`（workers）と `exclude`（client）は必ず同じパターンの組で保つこと。

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

**`src/lib/styles/*.css` には `coverage.exclude` を足していない。** `src/app.html` と同じく
どのテストからも import されないが、`--coverage.exclude=src/app.html` だけの状態で
`--coverage.include=src/**` の下でも `npm run coverage` は落ちず、`.css` は
`coverage-final.json` にも text レポートにも現れないことを実測した。`.css` は「未カバー
ファイルの静的解析」パスに乗らない。`.html` と同じ対処を予防的に足さない。

**`.svelte` はどのテストからも import されない状態を作らない。** 「未カバーファイルの
静的解析」パスは、テストされない `.svelte` を svelte プラグインを経由しない変換にかけて
構文エラーで落とす（実際に、どのテストからも import していなかった `src/routes/+page.svelte`
で発生した）。一方、テストから import される `.svelte`（`src/lib/components/Counter.svelte`
等）はテスト実行時に client プロジェクトの svelte プラグインを通るため問題なく計測できる。
決定5（`.svelte` をカバレッジの分母に残し、画面側の配線を検証する）を成立させるため、
`.svelte` を `coverage.exclude` で外すのではなく、**どの `.svelte` にも最低1つは import
するテストを置く**ことで対処する。ただし、そのテストは「render して要素が存在すること」だけを
確認する存在確認であってはならない。存在確認は、対象を import してさえいれば分岐を実行せずに
通ってしまい、決定5 が求める「配線そのものの検証」になっていない。`+page.svelte` には
`src/routes/page.test.ts` を追加し、見出しの文字列一致に加えて、配置した子コンポーネント
（`Counter`）の初期表示値とクリック後の値の遷移まで固定した。**画面の配線を検証するとは、
「その画面が、期待どおりの子コンポーネント・値・状態遷移を実際に持っていること」を
アサーションで固定することであり、要素の有無だけを見ることではない。** 今後 `src/routes/`
配下に増える画面の `.svelte` にも、この水準でテストを添える。

## テストの評価

カバレッジ・実行結果のレポートを使ったテストのレビューは `~/.claude/skills/test-review/SKILL.md` の
手順で行う。`npm run coverage` が出す `coverage/coverage-final.json` をそのまま `--coverage-json` に
渡せる（client / workers 両方のファイルを含む集約済みの JSON である）。

ミューテーションテストは**導入していない**。品質検査は6項目
（テスト実行・型検査・lint・format・カバレッジ出力・CI）であり、ミューテーションはそこに含めない
（`~/.claude/skills/init-project/SKILL.md`）。価値を否定しての除外ではないので、実装が積まれた
時点で導入を再検討する。

## src/ の現状

- `src/routes/+page.svelte`: 管理者画面の入口（工程5）。状態の保持とイベント配線だけを持ち、
  ロジックは `src/lib` の純関数と `src/lib/api/client.ts`（API クライアント）へ寄せる（決定5）。
  テストは `src/routes/page.test.ts`（`+page.test.ts` にできない理由は前述）。
- `src/lib/components/`: 画面の各部品（`EmployeeManager.svelte` 従業員管理、
  `RequirementsHeatmap.svelte` 必要人数ヒートマップ、`AvailabilityEditor.svelte` 出勤可能
  時間帯入力、`ScheduleBoard.svelte` シフト表・不足人数表示）。いずれも表示とイベント配線
  だけを持ち、ロジックは `src/lib` 直下の純関数（`heatmap.ts` / `employees.ts` /
  `availability.ts` / `schedule.ts` / `pinning.ts` / `debounce.ts` / `date.ts`）に置く。
- `src/lib/api/client.ts`: `src/routes/api/`（工程4、並行実装）を呼ぶ薄いクライアント。
  HTTP 呼び出しをこの1モジュールに閉じ込め、`fetch` を注入可能にしている
  （`src/lib/api/types.ts` に `StoredEmployee` の画面側の型を独立定義。理由は
  `$lib/server/*` をクライアントコードから import できないため）。
- `src/routes/api/health/+server.ts`: workers プロジェクトを成立させるための最小 API。
- `src/lib/domain/`: ドメインの型・定数。`shift.ts` に役割・従業員・出勤可能時間帯・必要人数
  （`SLOT_COUNT` / `MIN_SHIFT_LENGTH` / `MAX_SHIFT_LENGTH` / `ROLES` / `Role` / `Availability` /
  `Employee` / `SlotRequirements`）、`day.ts` に日付に属するデータの型（固定割当・求解結果を
  含む `DayData`）を置く。もとは `src/poc/types.ts` にあったが、D1 スキーマ・seed モジュールも
  同じ役割集合・コマ数を必要とするため工程2で移設した（定数を2箇所に置くと乖離するため）。
  `src/poc/` の各モジュールはここを import する（`src/poc/types.ts` には LP/求解結果固有の型
  だけが残る）。
- `src/lib/server/db/`: D1 アクセス層。「D1 スキーマと初期化（工程2）」の節を参照。
- `src/lib/styles/`: デザインシステムの適用層。「デザインシステム（`DESIGN.md`）」の節を参照。
- `src/app.html` / `src/app.d.ts`: SvelteKit の規約ファイル。`app.d.ts` の `Platform.env.DB` は
  D1 バインディングの型で、`@cloudflare/workers-types` の `D1Database` を参照する。

## デザインシステム（`DESIGN.md`）

画面の見た目は `DESIGN.md` を唯一の正として決める。これは
<https://github.com/cancer/design-system> からコピーした配布物で、形式は
[google-labs-code/design.md](https://github.com/google-labs-code/design.md)（alpha）に準拠する。
トークンの層は **primitive（値の尺度）→ 役割 → component** で、色は必ず役割層
（`primary` / `danger` / `warning` / `success` / `neutral`）を経由し、primitive を直接参照しない。

### 3つのファイルの役割分担

| ファイル                    | 持つもの                                                                        |
| --------------------------- | ------------------------------------------------------------------------------- |
| `DESIGN.md`                 | トークンの正。フロントマターが機械可読な定義、本文がその意味                    |
| `src/lib/styles/tokens.css` | `DESIGN.md` のフロントマターを CSS カスタムプロパティへ写したもの               |
| `src/lib/styles/base.css`   | トークンを要素・クラス（`.button` / `.note` / `.card` / `.badge` 等）へ当てる層 |

両 CSS は `src/routes/+layout.svelte` が import する（全画面に効く）。

`tokens.css` は `DESIGN.md` から機械的に写したものなので、**直接編集しない**。値を変えるときは
`DESIGN.md` を直してから写す。生成器は正リポジトリ側に属し、ここへは置かない
（正リポジトリの CLAUDE.md「配布物は `DESIGN.md` 1枚」）。そのため写しは手作業になり、
`DESIGN.md` と `tokens.css` は乖離しうる。**片方を触ったらもう片方も合わせること。**

非色の行（typography / rounded / spacing / shadow）は `tokens.css` に component 単位の変数を
作らず、`base.css` と各 `.svelte` が尺度のキー（`var(--spacing-lg)` / `var(--rounded-md)` 等）を
直接引く。`DESIGN.md` がこれらの値種別に役割を定義していないため、経由すべき役割層トークンが
存在しないことに対応している。

### `DESIGN.md` は整形しない

`.prettierignore` で `DESIGN.md` を `oxfmt` の対象から外している。整形して upstream と差が出ると、
正の更新をコピーし直すときの差分がノイズだらけになるためである（`oxfmt` は `.prettierignore` を
既定の ignore-path として読む）。

### プロジェクト固有 component は `DESIGN.md` のコピー側に足す

正リポジトリが持つのは横断 component（`screen` / `link` / `icon` / `button` / `note` / `card` /
`badge` / `input`）だけである。この画面が必要とする `appbar` / `tab` / `grid` / `heat-cell` /
`shortage-cell` / `shift-bar` は、消費側であるこのコピーの `components` に足してある（本文の
「プロジェクト固有 Components」節がその意味を持つ）。**正リポジトリへは戻さない。**

### 色を `.svelte` に直書きしない

セルの色のように値が連続的に見えるものも、生の色を計算しない。`src/lib/heatmap.ts` の
`heatLevel` は人数を段（`0`〜`maxLevel`）へ写すだけで、色は
`heat-cell-level-<n>-*` / `shortage-cell-level-<n>-*` トークンが持つ。`.svelte` は
`data-level` 属性を当て、CSS 側の属性セレクタでトークンを引く。

### フォーカスリングは触らない

`outline: none` で消すことも、独自色へ塗り替えることもしない（`DESIGN.md` の Don't）。
既定リングは UA が地とのコントラストを自動確保するが、変更した瞬間に WCAG 1.4.11 の
3:1 の立証責任が作者へ移るためである。

### light / dark

`tokens.css` の `:root` が light を、`@media (prefers-color-scheme: dark)` の `:root` が dark を
持ち、`:root { color-scheme: light dark; }` で UA 描画（フォーム部品・スクロールバー・
フォーカスリング）も追従させている。theme を切り替える UI は持たない。

### 文字色×地色を足すときは AA を検証する

`DESIGN.md` は文字色×地色のペアに WCAG AA（4.5:1）を要求する。正リポジトリには
`npm run check:contrast` があるが、配布されるのは `DESIGN.md` 1枚なのでこちらには無い。
ペアを足す・変えるときは OKLCH を sRGB へ変換して比を出し、4.5 を下回らないことを確かめる
（`disabled` は WCAG の inactive 例外で対象外）。

## D1 スキーマと初期化（工程2）

### バインディング（`DB`）は2ファイルに書く義務がある

D1 バインディング（名前は `DB`。`src/app.d.ts` の `Platform.env.DB` に合わせている）は
`wrangler.jsonc`（製品）と `wrangler.test.jsonc`（`vitest.config.workers.ts` 専用）の
**両方**に書く。片方だけだと、テストが製品構成と異なるバインディングを検証することになり、
「workerd 上のローカル実 D1 に対して検証する」（決定6）の意味が崩れる。**この2ファイルを
同期させる義務が生じている。** 次にどちらかを触るときは、もう片方も同じ内容になっているか
確認すること。

`database_id` の扱いは2ファイルで違う。**`wrangler.jsonc`（製品）には `wrangler d1 create` が
出した実 ID をコミットしてある。** `database_id` は Wrangler 設定の required 項目であり、秘密ではない
（秘密は `wrangler secret put` 側で扱う。出典:
<https://developers.cloudflare.com/workers/wrangler/configuration/>）。プレースホルダーを置いて
デプロイのたびに手で差し替える運用は、書き換え漏れと戻し忘れの事故を招くのでやめた。
別アカウントで動かす場合はここを自分の `wrangler d1 create` の出力へ書き換える。

`wrangler.test.jsonc` は `database_name` が別（`scheduling-solver-demo-workers-test`）で
miniflare のローカル D1 しか使わないため、`database_id` はプレースホルダーのままである。
**同期させる義務があるのはバインディング名（`DB`）と構成であって、`database_id` の値ではない。**

### 物理設計

`migrations/0001_init.sql` に2テーブルを定義する。

- `employees`（日付をまたいで共有する従業員データ）: `roles`（役割集合。最大4要素の
  ROLES の部分集合）を正規化した中間テーブルにせず、`roles_json`（JSON配列のTEXT）1カラムに
  持たせている。この段階では「役割 X を持つ従業員を検索する」という roles 単位のクエリが無く、
  常に従業員1件を丸ごと読み書きするため。値が ROLES の要素であることは SQL の CHECK では
  表現せず、読み込み側（`src/lib/server/db/employees.ts` の `parseRoles`）で検証し、
  想定外の値があれば例外を投げる。
- `shift_days`（日付に属するデータ）: `date`（`'YYYY-MM-DD'` の TEXT）を主キーとし、
  「1日1枚」の論理単位を1行に対応させる。必要人数・出勤可能時間帯・固定割当・求解結果の
  4つの内訳を別テーブルへ正規化せず、`requirements_json` / `availability_json` /
  `pinned_assignments_json` / `solution_json` の4カラムにまとめている。理由は、画面がどの
  内訳も「その日のデータ」として常に丸ごと読み書きし、特定のコマ・役割・従業員だけを検索する
  需要がこの段階では無いため。データ量は数KB程度で、D1 の1行あたりの上限
  （2,000,000 bytes。出典: <https://developers.cloudflare.com/d1/platform/limits/>）に対して
  十分小さい。`solution_json` は `NULL` 許容で、`NULL` が「未求解」を表す。詳しい理由は
  `migrations/0001_init.sql` のコメントを参照。

新しい日付の作成（`src/lib/server/db/days.ts` の `createDay`）はテンプレートを適用せず、
必要人数を全コマ・全役割0、出勤可能時間帯・固定割当を空、求解結果を `NULL` にする。
既存の日付に対しては何もしない（`INSERT OR IGNORE`。べき等）。

### 初期化（seed）

`src/lib/server/db/seed.ts` が初期データ（従業員8人・固定した3日分の必要人数と出勤可能時間帯）
の唯一の投入元である（決定9）。具体的な値（従業員名・日付・人数）はこのモジュールだけが持ち、
`docs/requirements.md` には書かない。必要人数の値は意図的に調整していない（決定11。ピーク帯
〈ランチ・ディナー〉を2人、開店直後・閉店間際を1人または0人にした素直な値）。3日のうち2日は
1人ずつ「出勤可能時間帯を入力しない」（＝休み）従業員を変えており、「未入力はその日の休みと
して扱う」という規則が実際に意味を持つ入力にしている。

`src/lib/server/db/reset.ts` の `resetToSeed` が初期化処理である。`employees` と
`shift_days` を`DELETE`してから seed の内容を `INSERT`するところまでを1つの `db.batch()`で
アトミックに行うため、実行前の状態（工程4以降で増える従業員・日付を含む）に関わらず常に
同じ状態へ戻る（冪等）。求解結果・固定割当を投入する経路が無いため、初期化後は必ず未求解
になる（決定10）。HTTP エンドポイントとしての公開は工程4の範囲であり、本工程では関数までを
作る。

### マイグレーションをテスト前に適用する仕組み

`vitest.config.workers.ts` が Node.js 側で `@cloudflare/vitest-plugin` の
`readD1Migrations(migrationsPath)` を呼び、`migrations/` 配下のマイグレーションを読む。
読んだ結果は `cloudflareTest()` の `miniflare.bindings` 経由でテスト専用バインディング
`TEST_MIGRATIONS` として workerd 側へ渡し、`src/lib/server/db/apply-migrations.ts`
（workers プロジェクトの `setupFiles`）が `cloudflare:test` の
`applyD1Migrations(env.DB, env.TEST_MIGRATIONS)` で実際に適用する。

**`readD1Migrations` の import 元について、ドキュメント本文と実物が食い違っていた。**
公式ドキュメント
（<https://developers.cloudflare.com/workers/testing/vitest-integration/test-apis/>）は
「`@cloudflare/vitest-plugin/config` パッケージから呼ぶ」と書いているが、インストール済みの
`@cloudflare/vitest-plugin@1.1.4` の `package.json` の `exports` には `./config` という
サブパスが無く、`readD1Migrations` はルートの `@cloudflare/vitest-plugin`
（`dist/pool/index.d.mts`）からエクスポートされている。cloudflare/workers-sdk リポジトリの
公式サンプル（`fixtures/vitest-plugin-examples/d1/vitest.config.ts`。
`gh api repos/cloudflare/workers-sdk/contents/...` で取得し内容を確認済み）もルートからの
import で書かれており、実行環境で動作も確認したため、本プロジェクトはルートからの import を
採用している。`applyD1Migrations` のシグネチャ（`(db, migrations, migrationsTableName?)`）は
ドキュメント記載どおりで、インストール済みパッケージの型定義とも一致することを確認した。

`env.DB` / `env.TEST_MIGRATIONS` の型は `src/lib/server/db/env.d.ts` が
`Cloudflare.Env`（`cloudflare:workers` の `env` / `cloudflare:test` が参照する名前空間）に
宣言している。`tsconfig.json` の `compilerOptions.types` に
`@cloudflare/vitest-plugin/types`（`cloudflare:test` の型を提供する）を追加していないと、
`svelte-check` が `apply-migrations.ts` の `cloudflare:test` import を解決できず
`typecheck` が落ちる。追加済みである。

### 実測事実: `setupFiles` 経由で読み込まれるファイルはカバレッジの分母に載らない

`src/lib/server/db/apply-migrations.ts` は実行文を1つ持つ実体のあるファイルだが、
`npm run coverage` が出す `coverage/coverage-final.json` に登場しない
（キー自体が無い。低カバレッジとして出るのではない）。同じ workers プロジェクト
（workerd 環境）で実行される `days.ts` / `employees.ts` / `reset.ts` / `seed.ts` は
計装されて `coverage-final.json` に含まれるため、「workerd 環境だから計装されない」
という単純な話ではない。`apply-migrations.ts` が他と違う点は、通常のテストファイルの
import グラフ経由ではなく、`vitest.config.workers.ts` の `test.setupFiles` として
読み込まれていることである。

**この事実の原因（istanbul provider が `setupFiles` を計装しない、
`@cloudflare/vitest-plugin` が `setupFiles` を通常と別経路で読み込んでいる、等）は
未確認である。** 原因を推測で書かない。

実務上の含意: `--coverage.include=src/**` を外していなくても、`setupFiles` として
読み込まれるファイルは閾値90の分母に入らない。**今後このディレクトリへ分岐を持つ
`setupFiles` を追加する場合、その分岐は閾値では検出されない。** 分岐を持たせる場合は
分岐を含むロジックを `setupFiles` 本体ではなく通常の（テストから import される）
モジュールへ出し、`setupFiles` 側は薄く保つこと。

### D1 の制限値（実行環境公式ドキュメントで確認済み）

出典: <https://developers.cloudflare.com/d1/platform/limits/>

- 1行あたりの最大サイズ: 2,000,000 bytes（2 MB）
- 1クエリあたりの最大バインドパラメータ数: 100
- SQL文の最大長: 100,000 bytes（100 KB）
- `D1Database.batch()` はトランザクションとして実行される（"Batched statements are SQL
  transactions. If a statement in the sequence fails, then an error is returned for that
  specific statement, and it aborts or rolls back the entire sequence."）。`resetToSeed` や
  `replaceAllEmployees` のアトミック性はこれに基づく。

工程6（実際の `wrangler d1 create` の挙動、リモート D1 の制限の実測、マイグレーションの
リモート適用）は未確認・未着手である。

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
