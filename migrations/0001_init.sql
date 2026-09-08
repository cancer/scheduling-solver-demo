-- 従業員（日付をまたいで共有するデータ）。
--
-- roles は ROLES（hall/hot/cold/dishwashing）の部分集合で、最大4要素という
-- 小さく固定された集合である。中間テーブルへ正規化せず、JSON配列としてそのまま
-- 1カラムに保存する。理由: この段階（工程2）では「役割 X を持つ従業員を検索する」
-- ような roles 単位のクエリが無く、常に従業員1件を丸ごと読み書きする。正規化して
-- JOIN を増やすより、1行=1従業員の単純な形を選んだ。roles の値が ROLES の要素で
-- あることは SQL の CHECK では表現せず、アプリケーション側（保存・読込のコード）
-- で検証する。
CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  roles_json TEXT NOT NULL,
  min_shift_length INTEGER NOT NULL,
  max_shift_length INTEGER NOT NULL
);

-- 日付に属するデータ。1日分のシフト計画という論理単位を、date を主キーとする
-- 1行に対応させる（「1日1枚」）。ある日付の行への書き込みは、他の日付の行に
-- 一切影響しない。
--
-- 内訳4つ（必要人数・出勤可能時間帯・固定割当・求解結果）を別テーブルへ分割せず、
-- 1行の中の4カラムにまとめた。理由:
-- - どの内訳も、日付単位で常に丸ごと読み書きされる（画面は「その日のデータ」を
--   一括で読み、一括で保存する。1行だけを更新するような使い方をしない）。
-- - 必要人数はコマ(28)×役割(4)で112個の値、出勤可能時間帯は従業員ごとに最大1区間、
--   固定割当・求解結果も配列で、いずれも数KB程度に収まり、D1の1行あたりの上限
--   （2,000,000 bytes。出典:
--   https://developers.cloudflare.com/d1/platform/limits/ ）に対して十分小さい。
-- - 正規化して112行の必要人数テーブル等に分けても、この段階では
--   「特定のコマ・役割だけを検索する」という需要が無く、複雑さが増えるだけになる。
--
-- date は 'YYYY-MM-DD' 形式の TEXT。SQLite/D1 には専用の DATE 型が無いため、
-- 文字列比較で辞書順とカレンダー順が一致する ISO 8601 形式をアプリケーション側の
-- 規約として使う。
--
-- solution_json は NULL 許容で、NULL が「未求解」を表す。新しい日付の作成時は
-- requirements_json を全コマ・全役割0、availability_json を空オブジェクト、
-- pinned_assignments_json を空配列、solution_json を NULL にする（テンプレートを
-- 適用しない空データ）。
CREATE TABLE shift_days (
  date TEXT PRIMARY KEY,
  requirements_json TEXT NOT NULL,
  availability_json TEXT NOT NULL,
  pinned_assignments_json TEXT NOT NULL,
  solution_json TEXT
);
