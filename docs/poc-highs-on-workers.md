# HiGHS on Cloudflare Workers PoC

この文書は、`highs@1.14.2` の WASM ビルドを Cloudflare Workers 上で初期化し、上限側のダミー MILP を求解して CPU 時間を測る手順と結果欄をまとめたものである。デプロイと本番測定はこのリポジトリの利用者が行う。

## 測定手順

### 前提

- クリーン checkout から実行する。Wrangler はプロジェクトにローカル固定し、未インストール時に
  `npx` が最新版を取得する挙動を避ける。[Wrangler のインストールと実行方法](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
  でもローカルインストールと Node.js のサポート対象が案内されている。

  ```sh
  git clone git@github.com:cancer/scheduling-solver-demo.git
  cd scheduling-solver-demo
  git checkout topic/poc-highs-on-workers
  git checkout <測定対象コミット>
  ```

  `<測定対象コミット>` は測定するコミットの実際のハッシュへ置き換える。Node.js は 22 以上を用いる。
  pinned な `wrangler@4.129.0` の engines 要件は [`wrangler@4.129.0`](https://www.npmjs.com/package/wrangler/v/4.129.0)
  で確認できる。

  ```sh
  node --version
  npm ci
  test -f node_modules/highs/build/highs.wasm
  test "$(node -p "require('./node_modules/wrangler/package.json').version")" = "4.129.0"
  npx --no-install wrangler --version
  ```

  `node --version` が `v22` 未満、WASM ファイルが無い、または Wrangler の表示が
  `4.129.0` でない場合は測定を開始しない。`npm install` は実行しない。以降の Wrangler コマンドは
  `npx --no-install wrangler` とし、別バージョンをダウンロードさせない。

- Cloudflare の Paid プランを使う。`limits.cpu_ms` は `wrangler.poc.jsonc` に指定していないため、Paid プランの既定 CPU 上限 30,000 ms を測定の絶対ラインとする。
- Wrangler の認証済みアカウントと、デプロイ先のアカウントが選択済みであることを確認する。未認証なら `npx --no-install wrangler login` を一度実行する。

### デプロイ

次のコマンドで PoC 専用 Worker をデプロイする。

```sh
npx --no-install wrangler deploy -c ./wrangler.poc.jsonc
```

出力された `https://...workers.dev` の URL を控える。Worker 名は `scheduling-solver-highs-poc` である。

### 求解リクエスト

Worker は GET リクエストごとに、10人・4役割・28コマ・勤務長さ8〜16コマの上限側 fixture を LP テキストへ変換して1回求解する。控えた URL に対して次を実行する。

```sh
curl --fail-with-body -sS -i https://<デプロイされたWorkerのURL>/
```

レスポンス JSON の `status` が `Optimal` で、`model.binaryVariableCount` が `6120`、`model.shortageVariableCount` が `112`、`model.penaltyM` が `161` であることを確認する。これらはモデルが測定対象の fixture になっていることを確認するための値であり、CPU 時間そのものではない。

### invocation に含める処理

固定 fixture は handler が保持する。各 GET の HTTP invocation 内で、LP の生成、
`prepareHighsWorkerEnvironment`、HiGHS loader の初期化（prepare → load）、求解、レスポンス整形をこの順に
実行する。これは LP 生成と求解を Workers Logs の invocation CPU に含めて測るための意図した構成である。

Workers には invocation とは別に startup 制限があり、Paid プランでも **1秒**である。startup は handler
実行前のトップレベル global-scope の処理を指し、超過すると invocation が始まる前に拒否され得る。
一方、invocation CPU は個々の HTTP リクエスト中に Worker コードが CPU を使用した時間である。詳細は
[Workers の制限](https://developers.cloudflare.com/workers/platform/limits/) を参照する。

### Workers Logs で CPU 時間と outcome を読む

1. Cloudflare ダッシュボードで対象アカウントを開く。
2. **Workers & Pages** から `scheduling-solver-highs-poc` を開く。
3. **Logs** または **Observability / Workers Logs** を開き、デプロイ直後に行ったリクエストの時刻に絞る。
4. 該当する invocation log を開き、`CPU time`（ms）と `outcome` を読む。リクエスト時刻と URL を照合し、別の invocation の値を採用しない。
5. 同じ条件で複数回測る場合も、各 invocation の `CPU time` と `outcome` を個別に記録する。最初の確認では少なくとも1回分をこの文書の測定結果欄へ転記する。

`CPU time` は invocation log の値を使う。Cloudflare は invocation の CPU 時間を
`cloudflare.cpu_time_ms` として示し、Worker の outcome も同じ invocation の属性として示す（[Spans and attributes](https://developers.cloudflare.com/workers/observability/traces/spans-and-attributes/)、
[Workers Trace Events](https://developers.cloudflare.com/logs/logpush/logpush-job/datasets/account/workers_trace_events/)、
[Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)）。

実測では、ダッシュボードの Workers Logs の代わりに `npx --no-install wrangler tail scheduling-solver-highs-poc --format json` を実行し、出力される Trace Events から `cpuTime`・`wallTime`・`outcome` を読んだ。ダッシュボードの invocation log と `wrangler tail` の Trace Events は同じ invocation の CPU 時間と outcome を示す情報源であり、どちらを使ってもこの後の判定条件に対して同等である。

判定は次のとおりとする。

- 合格: HTTP **200**、JSON の `status` が厳密に `Optimal`、model metadata が
  `binaryVariableCount: 6120`・`shortageVariableCount: 112`・`penaltyM: 161`、`outcome` が厳密に `ok`、
  CPU 時間が **30,000 ms 以下**のすべてを満たすこと。
- 目標ライン: CPU 時間 **1,000 ms 以下**。1,000 ms を超え 30,000 ms 以下で `outcome: ok` なら、
  動作上は合格だが目標未達として記録する。
- 不合格: `instantiateWasm` 経由で loader を初期化できない、HTTP が 200 でない、JSON の `status` が
  `Optimal` でない、model metadata が `binaryVariableCount: 6120`・`shortageVariableCount: 112`・
  `penaltyM: 161` のいずれかと一致しない、CPU 時間が **30,000 ms を超える**、または `outcome` が
  `ok` でない場合。model metadata が一致しない場合は、測定対象が意図した規模の fixture でないため
  CPU 時間の値も無効とし、CPU 時間の多寡によらず不合格とする。非成功 outcome として少なくとも
  `exceededCpu`、`exceededMemory`、`exception`、`canceled`、`unknown` を明示的に不合格とし、将来追加
  される値や未掲載の値も合格とはしない。

上記の合格・不合格は、起こりうる観測の組み合わせに対して漏れなく排他的である。すなわち、
loader 初期化・HTTP・`status`・model metadata・CPU 時間・`outcome` の6条件のうち1つでも不合格側の
条件に該当すれば不合格であり、6条件すべてが合格側の条件を満たす場合に限り合格となる。

## WASM import の確認記録

`highs/runtime` サブパスの静的 import は、Wrangler のバンドルで次の生エラーになった。

```text
No loader is configured for ".wasm" files: node_modules/highs/build/highs.wasm
```

そのため `src/poc/worker.ts` は `../../node_modules/highs/build/highs.wasm` を静的 import し、`wrangler.poc.jsonc` に `CompiledWasm` rule を設定している。この直接 import と `CompiledWasm` rule の組み合わせでは、`wrangler dev` のバンドル・起動・求解まで成功した。

## 測定結果

### デプロイ

- コマンド: `npx --no-install wrangler deploy -c ./wrangler.poc.jsonc`
- アカウント: PixelGrid（`04a649f869da1c6edf428dc640eae681`）
- Worker 名: `scheduling-solver-highs-poc`
- URL: `https://scheduling-solver-highs-poc.pxgrid.workers.dev`
- Version ID: `99e74b13-bf64-48de-b402-8e5473a88664`
- 測定対象コミット: `59d5443`
- 測定日: 2026-09-08（UTC）
- Total Upload: 3132.43 KiB / gzip: 1073.23 KiB
- Worker Startup Time: 17 ms（同一バンドルの別アップロードでは 21 ms）

### 求解リクエストのレスポンス（全5回とも同一）

- HTTP 200
- `status`: `Optimal`
- `objectiveValue`: 120
- `assignments`: 8件
- `shortages`: 112件
- `model`: `{"binaryVariableCount":6120,"shortageVariableCount":112,"penaltyM":161}`

### CPU 時間と outcome

`npx --no-install wrangler tail scheduling-solver-highs-poc --format json` の Trace Events から読んだ値。

| 回  | cpuTime | wallTime | outcome |
| --- | ------- | -------- | ------- |
| 1   | 1382 ms | 1480 ms  | ok      |
| 2   | 2442 ms | 2619 ms  | ok      |
| 3   | 1612 ms | 1705 ms  | ok      |
| 4   | 1063 ms | 1095 ms  | ok      |
| 5   | 1379 ms | 1418 ms  | ok      |

### 測定結果の要約

| 項目                                                   | 結果                                                     |
| ------------------------------------------------------ | -------------------------------------------------------- |
| `instantiateWasm` フック経由で loader を初期化できたか | できた（5回とも成功）                                    |
| 約6,120変数規模のダミー MILP から解が返ったか          | 返った（5回とも `status: Optimal`、model metadata 一致） |
| Workers Logs で読んだ CPU 時間（ms）                   | 上表参照（最小 1,063 ms・最大 2,442 ms）                 |
| 実行の `outcome`                                       | 5回とも `ok`                                             |

### 判定

- 絶対ライン（CPU 時間 30,000 ms 以下）: 合格。最大 2,442 ms で上限の約8%。
- HTTP 200・`status: Optimal`・model metadata 一致・`outcome: ok` のすべてを5回とも満たす。
- 目標ライン（CPU 時間 1,000 ms 以下）: 5サンプルすべて未達。最小 1,063 ms。
- したがって、動作上は合格だが目標未達として記録する。
