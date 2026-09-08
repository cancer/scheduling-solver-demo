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

判定は次のとおりとする。

- 合格: HTTP **200**、JSON の `status` が厳密に `Optimal`、model metadata が
  `binaryVariableCount: 6120`・`shortageVariableCount: 112`・`penaltyM: 161`、`outcome` が厳密に `ok`、
  CPU 時間が **30,000 ms 以下**のすべてを満たすこと。
- 目標ライン: CPU 時間 **1,000 ms 以下**。1,000 ms を超え 30,000 ms 以下で `outcome: ok` なら、
  動作上は合格だが目標未達として記録する。
- 不合格: `instantiateWasm` 経由で loader を初期化できない、HTTP が 200 でない、JSON の `status` が
  `Optimal` でない、CPU 時間が **30,000 ms を超える**、または `outcome` が `ok` でない場合。
  非成功 outcome として少なくとも `exceededCpu`、`exceededMemory`、`exception`、`canceled`、`unknown` を
  明示的に不合格とし、将来追加される値や未掲載の値も合格とはしない。

## WASM import の確認記録

`highs/runtime` サブパスの静的 import は、Wrangler のバンドルで次の生エラーになった。

```text
No loader is configured for ".wasm" files: node_modules/highs/build/highs.wasm
```

そのため `src/poc/worker.ts` は `../../node_modules/highs/build/highs.wasm` を静的 import し、`wrangler.poc.jsonc` に `CompiledWasm` rule を設定している。この直接 import と `CompiledWasm` rule の組み合わせでは、`wrangler dev` のバンドル・起動・求解まで成功した。

## 測定結果

本リポジトリの担当範囲ではデプロイと本番測定を行っていない。値は推測で埋めない。

| 項目                                                   | 結果   |
| ------------------------------------------------------ | ------ |
| `instantiateWasm` フック経由で loader を初期化できたか | 未測定 |
| 約6,120変数規模のダミー MILP から解が返ったか          | 未測定 |
| Workers Logs で読んだ CPU 時間（ms）                   | 未測定 |
| 実行の `outcome`                                       | 未測定 |
