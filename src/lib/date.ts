// 日付選択の既定値（今日）を作るための整形関数。`Date#toISOString()` は UTC で
// 変換するため日付がずれうる。ローカルの年月日をそのまま "YYYY-MM-DD" にする。
export function formatDateISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
