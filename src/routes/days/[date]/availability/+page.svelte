<script lang="ts">
  import { beforeNavigate } from "$app/navigation";
  import { getContext, onMount, untrack } from "svelte";
  import AvailabilityEditor from "$lib/components/AvailabilityEditor.svelte";
  import type { DayWithEmployeesPageData } from "$lib/api/loaders";
  import { createApiClient } from "$lib/api/client";
  import type { ApiClient } from "$lib/api/client";
  import { createDebouncer } from "$lib/debounce";
  import type { DayAvailability, DayData } from "$lib/domain/day";
  import { RESET_CONTEXT_KEY } from "$lib/reset-context";
  import type { ResetCoordinator } from "$lib/reset-context";

  const AUTOSAVE_DELAY_MS = 500;

  let {
    data,
    apiClient = createApiClient(fetch),
  }: {
    data: DayWithEmployeesPageData;
    apiClient?: ApiClient;
  } = $props();

  let day = $state<DayData>(untrack(() => data.day));
  let employees = $state(untrack(() => data.employees));
  const date = $derived(data.date);
  const resetCoordinator = getContext<ResetCoordinator | undefined>(RESET_CONTEXT_KEY);
  const saveDay = createDebouncer(AUTOSAVE_DELAY_MS, () => {
    void apiClient.putDay(date, day);
  });

  $effect(() => {
    day = data.day;
    employees = data.employees;
  });

  beforeNavigate(() => saveDay.flush());
  onMount(() => resetCoordinator?.registerCancel(saveDay.cancel));

  function handleCommit(availability: DayAvailability) {
    day = { ...day, availability };
    saveDay.trigger();
  }
</script>

<svelte:head><title>出勤可能時間帯 | {data.date} | シフト管理デモ</title></svelte:head>

<section class="page-section">
  <h2>出勤可能時間帯</h2>
  <p class="text-muted">
    当日の出勤可能時間帯は従業員ごとに1区間で入力します。未入力はその日の休みとして扱われ、変更は自動保存されます。
  </p>
  <AvailabilityEditor {employees} availability={day.availability} oncommit={handleCommit} />
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
</style>
