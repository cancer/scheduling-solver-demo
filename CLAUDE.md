# scheduling-solver-demo

数理最適化リゾルバーのデモを行う Web アプリケーション。解く対象は生産スケジューリング
（発注・工程・機械・作業者スキルの制約下での割り当て）である。要件は `docs/requirements.md`
にある。

構成は vite（`vanilla-ts` テンプレート）+ vitest。ビルド対象は `src/` 配下のみで、
`index.html` が `/src/main.ts` をエントリとして読み込む。

## 検査コマンド

| コマンド               | 挙動                                                          |
| ---------------------- | ------------------------------------------------------------- |
| `npm run lint`         | 非破壊。ファイルを書き換えない                                |
| `npm run lint:fix`     | **破壊的**。ファイルを書き換える                              |
| `npm run format:check` | 非破壊                                                        |
| `npm run format`       | **破壊的**。Markdown も整形対象に含む                         |
| `npm run typecheck`    | 非破壊                                                        |
| `npm test`             | テスト実行（`vitest run`。watch ではない）                    |
| `npm run coverage`     | テスト実行 + カバレッジ出力（`coverage/coverage-final.json`） |

キー名からは破壊的かどうかが読めないので、ここに明記する。CI（`.github/workflows/quality.yml`）は
非破壊側だけを実行する。

`npm run format` が Markdown も整形する点に注意する。ドキュメントを追加・編集したあとに
`format:check` が落ちるのはこのためで、`npm run format` を一度走らせれば戻る。

## カバレッジ閾値

閾値 90 は**保持線**である。要求水準ではなく「これ以上未検証の分岐を増やさない」ための下限として
置いている。テストが積まれてきたら、この下限を実績に合わせて上げ直す。下げる場合は理由をここに書く。

閾値は `package.json` の `coverage` スクリプトのコマンドラインにある（設定ファイルではない）。
同じスクリプトの `--coverage.include=src/**` を**外してはいけない**。vitest 4 は `coverage.all` が
廃止されており、この指定が無いとテストから import されたファイルだけが計測対象になる。外すと、
テストの無いファイルを追加しても分母に載らず、閾値が作動しなくなる。

## テストの評価

カバレッジ・実行結果のレポートを使ったテストのレビューは `~/.claude/skills/test-review/SKILL.md` の
手順で行う。`npm run coverage` が出す `coverage/coverage-final.json` をそのまま `--coverage-json` に
渡せる。

ミューテーションテストは**導入していない**。初期構築で揃えた品質検査は6項目
（テスト実行・型検査・lint・format・カバレッジ出力・CI）であり、ミューテーションはそこに含めない
（`~/.claude/skills/init-project/SKILL.md`）。価値を否定しての除外ではないので、実装が積まれた
時点で導入を再検討する。

## src/ の現状

- `src/placeholder.test.ts` は環境が動いていることを示すための足場である。最初の実装を書く時点で
  削除するか、実際の振る舞いを検証するテストへ差し替える
- `src/main.ts` は `export {};` の1行だけを持つ。`index.html` の
  `<script type="module" src="/src/main.ts">` が指す先なので、消すと `npm run dev` が壊れる。
  空ファイルにもできない（oxlint の `unicorn(no-empty-file)` が `Empty files are not allowed` で
  lint を落とす）。最初の実装で中身を書く。この1行に対して oxlint が
  `unicorn(require-module-specifiers)` の warning を出すが、warning なので `npm run lint` は
  exit 0 のままである。最初の実装で中身を書けば消える
- vite テンプレート由来の実装（`counter.ts` / `style.css` / `src/assets/` / `public/icons.svg`）は
  削除済みである。DOM を触る実装を残さないことで、カバレッジ閾値を満たすための jsdom 等の
  DOM 環境が不要になっている。DOM を扱う実装を書く段階で、テスト環境の追加を判断する

## テストの置き場所

`tsconfig.json`（vite の生成物）の `include` は `["src"]` である。`test/` 配下はルートの型検査の
対象にならないので、テストは `src/` 配下に置く（`*.test.ts`）。

## 開発の進め方

以下のスキルを読み、その手順に従う（本文はコピーしない。スキル側の更新に追随させるため）。

- 実装依頼の入口: `~/.claude/skills/dev-workflow/SKILL.md`
- 実装時の共通方針: `~/.claude/skills/write-code/SKILL.md`
- テストの書き方: `~/.claude/skills/test-driven-development/SKILL.md`
- PR 作成: `~/.claude/skills/create-pr/SKILL.md`
