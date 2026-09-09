# デプロイ手順（Wrangler / D1）

この文書は、このリポジトリを新しい Cloudflare アカウントへ初めてデプロイするための手順書である。
D1 データベースの作成からデプロイ後のスモークテストまでを、新しい環境で再現できる順序で書く。

**この文書に書いた `wrangler d1 create` の実行・リモート D1 へのマイグレーション適用・
`wrangler deploy` は、Cloudflare アカウントの認証を伴う操作であり、このドキュメントを書いた
作業ツリーのサンドボックスの外である。本工程ではこれらのコマンドを実行していない。** 以降の
手順は、インストール済みの `wrangler@4.129.0`（`package.json` で固定）の `--help` 出力で構文を
確認した上で書いている。出典は各手順の直後に添える。

## 前提

- Node.js 22 以上。`docs/poc-highs-on-workers.md` の前提節と同じ確認を先に行う。

  ```sh
  node --version
  npm ci
  test "$(node -p "require('./node_modules/wrangler/package.json').version")" = "4.129.0"
  node_modules/.bin/wrangler --version
  ```

- Cloudflare の認証済みアカウントを用意する。未認証なら次を一度実行する。

  ```sh
  node_modules/.bin/wrangler login
  ```

  認証状態は `node_modules/.bin/wrangler whoami` で確認できる。

- Workers Paid プランを使う（`docs/poc-highs-on-workers.md` の PoC 測定もこの前提で行っている）。

## 1. D1 データベースの作成

```sh
node_modules/.bin/wrangler d1 create scheduling-solver-demo
```

`wrangler d1 create` は「新しい D1 データベースを作成し、バインディングと UUID を出力する」コマンドである
（`node_modules/.bin/wrangler d1 create --help` の説明文）。出力に含まれる `database_id`
（UUID 形式）を、次の手順でコピーする。

このコマンドはリモートの D1 データベースに対して作用する（同 `--help` の末尾
「This command acts on remote D1 Databases.」）。実行後、Cloudflare 側にデータベース名
`scheduling-solver-demo` の実体ができる。**同じ名前のデータベースが既に存在する場合は
このコマンドを再実行しない**（重複作成になる）。既存の ID を使う場合は
`node_modules/.bin/wrangler d1 list` または `wrangler d1 info scheduling-solver-demo` で確認する。

## 2. `database_id` の反映

**`wrangler.jsonc` の `d1_databases[0].database_id` には、既に実 ID がコミットされている**
（personal アカウント `zodiac.cancer.j6@gmail.com` の `scheduling-solver-demo`）。同じアカウントで
デプロイする場合、この手順は不要である。**別のアカウント・別のデータベースで動かす場合だけ**、
手順1で取得した `database_id` に書き換える。

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "scheduling-solver-demo",
    "database_id": "<手順1で取得した database_id>",
  },
],
```

このリポジトリには D1 バインディング `DB` を持つ設定ファイルが2つある。

| ファイル              | 用途                                                      | `database_id` の扱い                     |
| --------------------- | --------------------------------------------------------- | ---------------------------------------- |
| `wrangler.jsonc`      | 実際にデプロイする Worker                                 | 実 ID に書き換える（本手順の対象）       |
| `wrangler.test.jsonc` | `vitest.config.workers.ts` 専用（workerd 上のテスト実行） | プレースホルダーのままでよい（下記理由） |

`wrangler.test.jsonc` の `database_id` を実 ID に揃える必要が無い理由: `vitest.config.workers.ts` は
`cloudflareTest({ wrangler: { configPath: "./wrangler.test.jsonc" } })` で miniflare を起動し、
マイグレーションは Node.js 側で読んだものを `miniflare.bindings` 経由で渡し、実際の適用は
`cloudflare:test` の `applyD1Migrations`（`src/lib/server/db/apply-migrations.ts`）が行う
（`vitest.config.workers.ts:24-51` のコメントと実装）。つまり `wrangler.test.jsonc` の D1 は
常にローカルの miniflare シミュレーションであり、Cloudflare の実 API に `database_id` を
問い合わせることが無い。

**同期させる義務がある、とされている点の適用範囲**: 2ファイルとも `binding: "DB"` を持つ
（これは既に一致している。変更しない）。バインディング名や `database_name` の命名規則を
どちらか一方だけ変えると、コードは同じ `platform.env.DB` 型を期待するのに設定だけがずれる
という不整合が起きる。ここまでは同期が必要である。一方で `database_id` の実値は、
上記の理由により `wrangler.test.jsonc` 側では参照されないため、プレースホルダーのままでよいと
判断した。**この判断はこの文書を書いた工程6の推測であり、契約書
（`/private/tmp/claude-501/.../scratchpad/contract.md`）の文言そのものではない。** 将来
`wrangler.test.jsonc` を実際の D1 に対して使う変更が入る場合は、この節を見直すこと。

## 3. マイグレーションの適用

マイグレーションファイルは `migrations/0001_init.sql` にあり、`d1_databases` の
`migrations_dir` を明示していないため既定値 `./migrations` が使われる
（`node_modules/wrangler/config-schema.json` の `migrations_dir` の説明:
「defaults to './migrations'」）。

### ローカル（`wrangler dev` 用）

```sh
npm run db:migrate:local
```

### リモート（実際の D1 に適用）

```sh
npm run db:migrate:remote
```

いずれも `wrangler d1 migrations apply <database> [--local|--remote]` を呼ぶ
（`node_modules/.bin/wrangler d1 migrations apply --help`）。未適用のマイグレーションを確認する
だけなら `node_modules/.bin/wrangler d1 migrations list scheduling-solver-demo --remote` を使う
（同ヘルプ、および `d1 migrations list --help`）。

適用前に確認プロンプトが出る。CI 等の非対話環境では確認はスキップされ、バックアップは
それでも取得される（`d1 migrations apply --help` の説明）。適用に失敗したマイグレーションは
ロールバックされ、直前に成功したマイグレーションの状態が残る（同ヘルプ）。

## 4. デプロイ

```sh
npm run deploy
```

`deploy` スクリプトは `svelte-kit sync && vite build` の完了後（`build` スクリプト経由）に
`wrangler deploy` を実行する。`wrangler.jsonc` の `main` は `.svelte-kit/cloudflare/_worker.js`
であり、ビルド成果物を先に作らないとこのファイルが存在しない。

デプロイ結果は `node_modules/.bin/wrangler deployments list` や、出力される
`https://<name>.<subdomain>.workers.dev` の URL で確認する。

## 5. デプロイ後のスモークテスト

**認証・認可が無い**（契約
`/private/tmp/claude-501/.../scratchpad/contract.md` の「HTTP の契約」節: 「認証・認可は無い」）。
デプロイした URL を知っていれば誰でも読み書きできる。この前提を踏まえ、公開する URL の扱いに
注意する（意図せず共有しない、デモ後は `wrangler delete` や Custom Domain の解除を検討する等は
このリポジトリの利用者の判断に委ねる）。

以下をデプロイ済みの URL に対して手で確認する。`<base>` はデプロイ URL に読み替える。

1. **従業員 CRUD**
   - 画面から従業員一覧が表示される（初期状態では seed の8人）。
   - 従業員を追加・編集・削除し、再読み込み後も反映が残っていることを確認する
     （`PUT /api/employees` → `GET /api/employees` の順に効いていることの確認）。
2. **日付入力**
   - 日付を選び、その日の必要人数ヒートマップ・出勤可能時間帯が表示される。
   - 未作成の日付を開くと空データで作成されることを確認する
     （契約: `GET /api/days/[date]` は「未作成なら作成して空を返す」）。
3. **自動保存**
   - ヒートマップのセルを塗り、ドラッグを離した時点で変更が送信されることを確認する
     （契約の決定18: ドラッグを離した時点でまとめて送信）。ネットワークタブや再読み込みで
     変更が保存されていることを確かめる。
4. **求解**
   - 求解を実行し、結果（割当・不足）が画面に反映されることを確認する。
   - レスポンスが返るまで画面が同期的に待つこと（契約の決定19: 求解は同期レスポンス）を確認する。
5. **ピン留め再求解**
   - 勤務バーをクリックして固定し、固定した勤務が見た目で区別されることを確認する。
   - 固定・解除を切り替えるたびに再求解が走ることを確認する。
6. **初期化**
   - 「初期データに戻す」を実行し、`POST /api/reset` 相当の処理で従業員・日付データが
     seed の状態に戻ることを確認する。

## 6. 測定値の引き継ぎ

### ソルバー求解の CPU 時間（PoC 実測、`docs/poc-highs-on-workers.md` より）

- 絶対ライン: Paid プランの既定 CPU 上限 30,000 ms。5回の実測は 1,063〜2,442 ms で、
  最大値でも上限の約8%。合格。
- 目標ライン: 1,000 ms 以下。5回とも未達（最小 1,063 ms）。動作上は合格だが目標未達として
  記録されている。

### seed 規模の実測

502〜766 ms（PoC Worker へ seed 規模の fixture をデプロイし、`wrangler tail` の Trace Events
から5回分読んだ実測値。5回とも `outcome: ok`。この文書を書いた工程6自身は計測しておらず、
計測条件の詳細もこの文書の範囲外だが、実測値として引き継ぐ。**5回のみの測定であり、ばらつきの
分布までは計測していない**）。

### `.wasm` の gzip 後サイズ

工程3が `wrangler deploy --dry-run` で実測: **1,072.66 KiB**（`src/lib/solver/` が参照しない状態の
84.78 KiB から、solver（工程4）が使い始めた時点で約988 KiB 増える）。PoC Worker の実測値
1,073.07 KiB（`docs/poc-highs-on-workers.md`）とほぼ一致する。

Workers のスクリプトサイズ上限は圧縮前で 64 MiB（Free/Paid 共通。圧縮後のサイズには上限が無い）
であり（出典: [Workers の制限](https://developers.cloudflare.com/workers/platform/limits/)）、
gzip 後 1,072.66 KiB（≒ 1.05 MiB）という参考値そのものは制限の対象ではないが、実際に測っている
`wrangler deploy --dry-run` の Total Upload（圧縮前サイズ）も含めて、この上限に対して十分小さい。

### D1 の制限値（採用プランが Workers Paid プランであることの確認）

出典: [D1 の制限](https://developers.cloudflare.com/d1/platform/limits/)（2026-09-08 に確認）。

| 項目                                | Workers Paid プランの制限値 |
| ----------------------------------- | --------------------------- |
| アカウントあたりのデータベース数    | 50,000（要リクエスト）      |
| データベース最大サイズ              | 10 GB                       |
| アカウントあたりの最大ストレージ    | 1 TB（要リクエスト）        |
| Time Travel 期間                    | 30日                        |
| Worker 呼び出しあたりのクエリ数     | 1,000                       |
| テーブルあたりの最大列数            | 100                         |
| 行サイズ上限                        | 2 MB                        |
| SQL 文最大長                        | 100 KB                      |
| バウンドパラメータ上限              | 100個                       |
| クエリ最大実行時間                  | 30秒                        |
| 同時接続数（Worker 呼び出しあたり） | 6接続                       |

`migrations/0001_init.sql` の設計コメントは、この行サイズ上限（2,000,000 bytes = 2 MB）を
根拠に、1行あたり数 KB 程度の JSON カラムをまとめる設計を選んでいる（`migrations/0001_init.sql`
のコメント）。本工程が確認した上記表の値と一致する。

## サンドボックス外の操作（この工程では未実行）

- `wrangler d1 create scheduling-solver-demo`（手順1）
- `wrangler d1 migrations apply scheduling-solver-demo --remote`（手順3、`npm run db:migrate:remote`）
- `wrangler deploy`（手順4、`npm run deploy`）
- 手順5のスモークテスト（デプロイ済みの URL が無いと実行できない）

いずれも Cloudflare アカウントの認証を必要とするため、このドキュメントを書いた作業ツリーの
サンドボックスの外である。呼び出し側がユーザーへ依頼すること。
