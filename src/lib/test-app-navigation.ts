// client プロジェクトで SvelteKit の仮想モジュールを解決するためのテスト用 shim。
// 本番ビルドでは SvelteKit が `$app/navigation` を提供する。

const beforeNavigateCallbacks = new Set<() => void>();
let invalidateAllCallCount = 0;

export function beforeNavigate(callback: () => void): void {
  beforeNavigateCallbacks.add(callback);
}

// このshimが保証するのはcallbackの登録とテストからの手動発火までであり、
// 実SvelteKitのナビゲーションライフサイクルで発火されることは検証していない（F2）。
export function triggerBeforeNavigate(): void {
  for (const callback of beforeNavigateCallbacks) {
    callback();
  }
}

export function getInvalidateAllCallCount(): number {
  return invalidateAllCallCount;
}

export function resetNavigationTestState(): void {
  beforeNavigateCallbacks.clear();
  invalidateAllCallCount = 0;
}

export async function invalidateAll(): Promise<void> {
  invalidateAllCallCount += 1;
}

export async function goto(url: string): Promise<void> {
  window.history.pushState({}, "", url);
}
