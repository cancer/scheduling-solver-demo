// 自動保存の配線が使う汎用デバウンサ。入力変更のたびに個別送信すると
// リクエストが増えすぎるため、短時間の連続変更を1回にまとめる。

export type Debouncer = Readonly<{
  trigger: () => void;
  cancel: () => void;
}>;

export function createDebouncer(delayMs: number, fn: () => void): Debouncer {
  let timer: ReturnType<typeof setTimeout> | undefined;

  return {
    trigger() {
      if (timer !== undefined) {
        clearTimeout(timer);
      }
      timer = setTimeout(fn, delayMs);
    },
    cancel() {
      if (timer !== undefined) {
        clearTimeout(timer);
        timer = undefined;
      }
    },
  };
}
