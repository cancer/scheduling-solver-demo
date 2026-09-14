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
  // note の variant（DESIGN.md の状態役割）。求解中は状態を主張しない neutral にする。
  let solveVariant = $state<"neutral" | "success" | "danger">("neutral");
  const date = $derived(data.date);

  $effect(() => {
    day = data.day;
    employees = data.employees;
  });

  // 連続クリックの制御（ボタン無効化・クリック拒否・古い応答の破棄・順序制御）は
  // 意図的に行わない（決定7）。求解中も各クリックをそのまま API へ渡す。
  async function solve(pinnedAssignments: readonly StoredAssignment[]) {
    solveVariant = "neutral";
    solveNotice = "求解中…";
    try {
      day = await apiClient.solveDay(date, pinnedAssignments);
      solveVariant = "success";
      solveNotice = "求解しました";
    } catch {
      solveVariant = "danger";
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
  <p class="text-muted">
    必要人数と出勤可能時間帯を入力してから、この日のシフトを求解します。不足人数は、必要人数を満たせなかったコマ・役割ごとの人数です。
    勤務バーをクリックすると固定・解除が切り替わり、そのたびに再求解します。
  </p>

  <div class="solve-bar">
    <button type="button" class="button button-primary" onclick={handleSolve}>
      この日のシフトを求解
    </button>
    <div aria-live="polite">
      {#if solveNotice !== ""}
        <p class="note note-{solveVariant}">{solveNotice}</p>
      {/if}
    </div>
  </div>

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
    gap: var(--spacing-md);
    min-width: 0;
  }
  .page-section h2 {
    font-size: var(--typography-h3-font-size);
    font-weight: var(--typography-h3-font-weight);
    line-height: var(--typography-h3-line-height);
  }
  .solve-bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--spacing-md);
  }
</style>
