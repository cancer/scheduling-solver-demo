<script lang="ts">
  import ScheduleBoard from "$lib/components/ScheduleBoard.svelte";
  import type { DayWithEmployeesPageData } from "$lib/api/loaders";
  import { createApiClient } from "$lib/api/client";
  import type { ApiClient } from "$lib/api/client";
  import type { DayData, StoredAssignment } from "$lib/domain/day";
  import { togglePinned } from "$lib/pinning";
  import { untrack } from "svelte";

  let {
    data,
    apiClient = createApiClient(fetch),
  }: {
    data: DayWithEmployeesPageData;
    apiClient?: ApiClient;
  } = $props();

  let day = $state<DayData>(untrack(() => data.day));
  let employees = $state(untrack(() => data.employees));
  let solveNotice = $state("");
  const date = $derived(data.date);

  $effect(() => {
    day = data.day;
    employees = data.employees;
  });

  // 連続クリックの制御（ボタン無効化・クリック拒否・古い応答の破棄・順序制御）は
  // 意図的に行わない（決定7）。求解中も各クリックをそのまま API へ渡す。
  async function solve(pinnedAssignments: readonly StoredAssignment[]) {
    solveNotice = "求解中…";
    try {
      day = await apiClient.solveDay(date, pinnedAssignments);
      solveNotice = "求解しました";
    } catch {
      solveNotice = "求解に失敗しました";
    }
  }

  async function handleSolve() {
    await solve(day.pinnedAssignments);
  }

  async function handleTogglePin(assignment: StoredAssignment) {
    const nextPinned = togglePinned(day.pinnedAssignments, assignment);
    day = { ...day, pinnedAssignments: nextPinned };
    await solve(nextPinned);
  }
</script>

<svelte:head><title>シフト表・求解 | {data.date} | シフト管理デモ</title></svelte:head>

<section class="page-section">
  <h2>シフト表・求解</h2>
  <p>
    必要人数と出勤可能時間帯を入力してから、この日のシフトを求解します。不足人数は、必要人数を満たせなかったコマ・役割ごとの人数です。
    勤務バーをクリックすると固定・解除が切り替わり、そのたびに再求解します。
  </p>
  <button type="button" onclick={handleSolve}>この日のシフトを求解</button>
  <p aria-live="polite">{solveNotice}</p>

  <ScheduleBoard
    {employees}
    solution={day.solution}
    pinnedAssignments={day.pinnedAssignments}
    ontogglepin={handleTogglePin}
  />
</section>

<style>
  .page-section {
    display: grid;
    gap: 1rem;
  }
  .page-section h2,
  .page-section p {
    margin: 0;
  }
</style>
