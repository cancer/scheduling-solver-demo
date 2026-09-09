// ルートレイアウトと日別ページの間で、保留中の自動保存を扱う context の契約。
// 可変な登録集合は createResetCoordinator の呼び出しごとに閉じ込め、モジュール全域の
// シングルトンにはしない。これにより別のレイアウトツリーやテストが干渉しない。

export const RESET_CONTEXT_KEY = Symbol("reset-coordinator");

export type ResetCoordinator = Readonly<{
  registerCancel: (cancel: () => void) => () => void;
  cancelPendingSaves: () => void;
}>;

export function createResetCoordinator(): ResetCoordinator {
  const cancellations = new Set<() => void>();

  return {
    registerCancel(cancel) {
      cancellations.add(cancel);
      return () => {
        cancellations.delete(cancel);
      };
    },
    cancelPendingSaves() {
      for (const cancel of cancellations) {
        cancel();
      }
    },
  };
}
