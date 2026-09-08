// リクエスト body の検証失敗を表す例外。`withErrorHandling`（./handle）が
// これを HTTP 400 に変換する。それ以外の例外は 500 として扱う（契約「エラーは
// HTTP ステータス + { "error": "<説明>" }」）。
export class ValidationError extends Error {}
