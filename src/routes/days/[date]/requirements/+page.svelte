<script lang="ts">
  import { beforeNavigate } from "$app/navigation";
  import { getContext, onMount, untrack } from "svelte";
  import RequirementsHeatmap from "$lib/components/RequirementsHeatmap.svelte";
  import type { DayPageData } from "$lib/api/loaders";
  import { createApiClient } from "$lib/api/client";
  import type { ApiClient } from "$lib/api/client";
  import { createDebouncer } from "$lib/debounce";
  import type { SlotRequirements } from "$lib/domain/shift";
  import type { DayData } from "$lib/domain/day";
  import { RESET_CONTEXT_KEY } from "$lib/reset-context";
  import type { ResetCoordinator } from "$lib/reset-context";

  const AUTOSAVE_DELAY_MS = 500;

  let {
    data,
    apiClient = createApiClient(fetch),
  }: {
    data: DayPageData;
    apiClient?: ApiClient;
  } = $props();

  let day = $state<DayData>(untrack(() => data.day));
  const date = $derived(data.date);
  const resetCoordinator = getContext<ResetCoordinator | undefined>(RESET_CONTEXT_KEY);
  const saveDay = createDebouncer(AUTOSAVE_DELAY_MS, () => {
    void apiClient.putDay(date, day);
  });

  $effect(() => {
    day = data.day;
  });

  beforeNavigate(() => saveDay.flush());
  onMount(() => resetCoordinator?.registerCancel(saveDay.cancel));

  function handleCommit(requirements: readonly SlotRequirements[]) {
    day = { ...day, requirements };
    saveDay.trigger();
  }
</script>

<svelte:head><title>必要人数 | {data.date} | シフト管理デモ</title></svelte:head>

<section class="page-section">
  <h2>必要人数</h2>
  <p>
    30分コマを列、役割を行として、コマごとの必要人数を入力します。塗る値を選び、ドラッグでまとめて塗れます。
    セルにフォーカスして矢印キーを押すと1人ずつ増減し、変更は自動保存されます。
  </p>
  <RequirementsHeatmap requirements={day.requirements} oncommit={handleCommit} />
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
