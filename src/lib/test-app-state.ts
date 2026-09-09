// client プロジェクトで SvelteKit の仮想モジュールを解決するためのテスト用 shim。
// 本番ビルドでは SvelteKit が `$app/state` を提供する。

export const page = {
  url: { pathname: "/" },
};
