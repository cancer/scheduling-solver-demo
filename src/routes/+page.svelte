<script lang="ts">
  import EmployeeManager from "$lib/components/EmployeeManager.svelte";
  import RequirementsHeatmap from "$lib/components/RequirementsHeatmap.svelte";
  import AvailabilityEditor from "$lib/components/AvailabilityEditor.svelte";
  import ScheduleBoard from "$lib/components/ScheduleBoard.svelte";
  import { createApiClient } from "$lib/api/client";
  import type { ApiClient } from "$lib/api/client";
  import type { StoredEmployee } from "$lib/api/types";
  import type { DayAvailability, DayData, StoredAssignment } from "$lib/domain/day";
  import type { SlotRequirements } from "$lib/domain/shift";
  import { createDebouncer } from "$lib/debounce";
  import { formatDateISO } from "$lib/date";
  import { togglePinned } from "$lib/pinning";
  import { untrack } from "svelte";

  // 管理者画面の入口。ロジックは `$lib` の純関数・API クライアントへ寄せ、
  // ここは状態の保持とイベント配線だけを持つ（決定5）。
  // 工程4（`src/routes/api/`）は並行実装のため、テストでは `apiClient` を
  // 差し替える（HTTP 呼び出しは `$lib/api/client` の1モジュールに閉じている）。

  const AUTOSAVE_DELAY_MS = 500;

  let {
    apiClient = createApiClient(fetch),
    initialDate = formatDateISO(new Date()),
  }: { apiClient?: ApiClient; initialDate?: string } = $props();

  // `initialDate` は初期値としてのみ使い、以後は日付選択 UI が `selectedDate` を
  // 直接更新する（`initialDate` の変化を追わない）。`untrack` でその意図を明示する。
  let selectedDate = $state(untrack(() => initialDate));
  let employees = $state<readonly StoredEmployee[]>([]);
  let day = $state<DayData | null>(null);

  const saveDay = createDebouncer(AUTOSAVE_DELAY_MS, () => {
    if (day !== null) {
      void apiClient.putDay(selectedDate, day);
    }
  });

  async function loadEmployees() {
    employees = await apiClient.getEmployees();
  }

  async function loadDay(date: string) {
    day = await apiClient.getDay(date);
  }

  $effect(() => {
    void loadEmployees();
  });

  $effect(() => {
    void loadDay(selectedDate);
  });

  function handleEmployeesChange(next: readonly StoredEmployee[]) {
    employees = next;
    void apiClient.putEmployees(next);
  }

  // 以下の3つのハンドラは `{#if day !== null}` の内側に配線した子コンポーネントだけが
  // 呼ぶため、呼ばれる時点で `day` は必ず非null。テンプレート側の分岐がその保証を
  // 与えているので、ここで再度 null チェックはしない。
  function handleRequirementsCommit(currentDay: DayData, next: readonly SlotRequirements[]) {
    day = { ...currentDay, requirements: next };
    saveDay.trigger();
  }

  function handleAvailabilityCommit(currentDay: DayData, next: DayAvailability) {
    day = { ...currentDay, availability: next };
    saveDay.trigger();
  }

  async function handleTogglePin(currentDay: DayData, assignment: StoredAssignment) {
    // クリックから画面が変わるまでの経過時間を計測できるようにしておく（決定4 の
    // 目標ライン=1秒の物差し）。ブラウザの開発者ツールで確認する想定で、値は
    // console に出すだけに留める（画面には出さない）。
    const clickedAt = performance.now();
    const nextPinned = togglePinned(currentDay.pinnedAssignments, assignment);
    day = { ...currentDay, pinnedAssignments: nextPinned };
    day = await apiClient.solveDay(selectedDate, nextPinned);
    console.debug(`再求解: ${(performance.now() - clickedAt).toFixed(0)}ms`);
  }

  async function handleReset() {
    saveDay.cancel();
    await apiClient.reset();
    await loadEmployees();
    await loadDay(selectedDate);
  }
</script>

<h1>シフト管理デモ</h1>

<label>
  日付
  <input type="date" bind:value={selectedDate} />
</label>

<button type="button" onclick={handleReset}>初期データに戻す</button>

<EmployeeManager {employees} onchange={handleEmployeesChange} />

{#if day !== null}
  {@const currentDay = day}
  <RequirementsHeatmap
    requirements={currentDay.requirements}
    oncommit={(next) => handleRequirementsCommit(currentDay, next)}
  />
  <AvailabilityEditor
    {employees}
    availability={currentDay.availability}
    oncommit={(next) => handleAvailabilityCommit(currentDay, next)}
  />
  <ScheduleBoard
    {employees}
    solution={currentDay.solution}
    pinnedAssignments={currentDay.pinnedAssignments}
    ontogglepin={(assignment) => handleTogglePin(currentDay, assignment)}
  />
{/if}
