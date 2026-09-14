<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { createApiClient } from "$lib/api/client";
  import type { ApiClient } from "$lib/api/client";
  import { formatDateISO } from "$lib/date";
  let {
    initialDate = "",
    apiClient = createApiClient(fetch),
  }: {
    initialDate?: string;
    apiClient?: ApiClient;
  } = $props();
  let selectedDate = $state(untrack(() => initialDate));

  // 「今日」は SSR の日時ではなく、ブラウザでマウントした時点のローカル日付を使う。
  onMount(() => {
    // 入口はデータを取得しないが、各画面と同じ差し替え口を維持する。
    void apiClient;
    if (selectedDate === "") {
      selectedDate = formatDateISO(new Date());
    }
  });

  const dayHref = $derived(
    selectedDate === "" ? "/days" : `/days/${selectedDate}/requirements`,
  );
</script>

<div class="entry">
  <header class="entry-heading">
    <h1>シフト管理デモ</h1>
    <p class="text-muted">
      対象日付を選んで、必要人数・出勤可能時間帯を入力し、その日のシフトを求解します。
    </p>
  </header>

  <div class="entry-cards">
    <section class="card entry-card" aria-labelledby="day-heading">
      <h2 id="day-heading">日別シフト</h2>
      <p class="text-muted">必要人数・出勤可能時間帯・求解結果は日付ごとに持ちます。</p>
      <label class="field">
        対象日付
        <input aria-label="対象日付" type="date" bind:value={selectedDate} />
      </label>
      <a class="button button-primary" href={dayHref}>この日のシフトを開く</a>
    </section>

    <section class="card entry-card" aria-labelledby="employee-heading">
      <h2 id="employee-heading">従業員マスタ</h2>
      <p class="text-muted">従業員の名前・役割・勤務長さは日付をまたいで共有します。</p>
      <a href="/employees">従業員を管理する</a>
    </section>
  </div>
</div>

<style>
  .entry {
    display: grid;
    gap: var(--spacing-xl);
  }
  .entry-heading {
    display: grid;
    gap: var(--spacing-sm);
  }
  .entry-cards {
    display: grid;
    gap: var(--spacing-lg);
    grid-template-columns: repeat(auto-fit, minmax(min(20rem, 100%), 1fr));
    align-items: start;
  }
  .entry-card {
    display: grid;
    gap: var(--spacing-md);
    justify-items: start;
  }
  .entry-card h2 {
    font-size: var(--typography-h3-font-size);
    font-weight: var(--typography-h3-font-weight);
    line-height: var(--typography-h3-line-height);
  }
  .entry-card .field {
    width: 100%;
    max-width: 16rem;
  }
</style>
