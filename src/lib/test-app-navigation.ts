// client プロジェクトで SvelteKit の仮想モジュールを解決するためのテスト用 shim。
// 本番ビルドでは SvelteKit が `$app/navigation` を提供する。

export function beforeNavigate(callback: () => void): void {
  void callback;
}

export async function invalidateAll(): Promise<void> {
  return;
}

export async function goto(url: string): Promise<void> {
  window.history.pushState({}, "", url);
}
