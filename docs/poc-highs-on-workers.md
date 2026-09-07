# HiGHS on Cloudflare Workers PoC

この文書は、`highs@1.14.2` の WASM ビルドを Cloudflare Workers 上で初期化し、上限側のダミー MILP を求解して CPU 時間を測る手順と結果欄をまとめたものである。デプロイと本番測定はこのリポジトリの利用者が行う。

## 測定手順

### 前提

- リポジトリのルートで実行する。
- Cloudflare の Paid プランを使う。`limits.cpu_ms` は `wrangler.poc.jsonc` に指定していないため、Paid プランの既定 CPU 上限 30,000 ms を測定の絶対ラインとする。
- Wrangler の認証済みアカウントと、デプロイ先のアカウントが選択済みであることを確認する。未認証なら `npx wrangler login` を一度実行する。

### デプロイ

次のコマンドで PoC 専用 Worker をデプロイする。

```sh
npx wrangler deploy -c ./wrangler.poc.jsonc
```

出力された `https://...workers.dev` の URL を控える。Worker 名は `scheduling-solver-highs-poc` である。

### 求解リクエスト

Worker は GET リクエストごとに、10人・4役割・28コマ・勤務長さ8〜16コマの上限側 fixture を LP テキストへ変換して1回求解する。控えた URL に対して次を実行する。

```sh
curl --fail-with-body -sS -i https://<デプロイされたWorkerのURL>/
```

レスポンス JSON の `status` が `Optimal` で、`model.binaryVariableCount` が `6120`、`model.shortageVariableCount` が `112`、`model.penaltyM` が `161` であることを確認する。これらはモデルが測定対象の fixture になっていることを確認するための値であり、CPU 時間そのものではない。

### Workers Logs で CPU 時間と outcome を読む

1. Cloudflare ダッシュボードで対象アカウントを開く。
2. **Workers & Pages** から `scheduling-solver-highs-poc` を開く。
3. **Logs** または **Observability / Workers Logs** を開き、デプロイ直後に行ったリクエストの時刻に絞る。
4. 該当する invocation log を開き、`CPU time`（ms）と `outcome` を読む。リクエスト時刻と URL を照合し、別の invocation の値を採用しない。
5. 同じ条件で複数回測る場合も、各 invocation の `CPU time` と `outcome` を個別に記録する。最初の確認では少なくとも1回分をこの文書の測定結果欄へ転記する。

判定は次のとおりとする。

- 絶対ライン: CPU 時間が Paid プラン既定の **30,000 ms** を超えず、`outcome` が `exceededCpu` または `exceededMemory` でないこと。これを超える、または該当 outcome になる場合は不合格とする。
- 目標ライン: 求解1回あたり **1,000 ms（1秒）以下**。絶対ライン内でも1,000 msを超えた場合は、PoC は動作したが目標未達として記録する。
- 不合格: `instantiateWasm` 経由で loader を初期化できない、`outcome` が `exceededCpu`、`outcome` が `exceededMemory` のいずれか。

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
