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

<h1>シフト管理デモ</h1>
<p>対象日付を選んで、必要人数・出勤可能時間帯を入力し、その日のシフトを求解します。</p>

<section class="entry-actions" aria-labelledby="day-heading">
  <h2 id="day-heading">日別シフト</h2>
  <label>
    対象日付
    <input aria-label="対象日付" type="date" bind:value={selectedDate} />
  </label>
  <a class="primary-link" href={dayHref}>この日のシフトを開く</a>
</section>

<section aria-labelledby="employee-heading">
  <h2 id="employee-heading">従業員マスタ</h2>
  <p>従業員の名前・役割・勤務長さは日付をまたいで共有します。</p>
  <a href="/employees">従業員を管理する</a>
</section>

<style>
  .entry-actions {
    display: grid;
    gap: 0.75rem;
    max-width: 28rem;
    margin: 2rem 0;
    padding: 1.25rem;
    border: 1px solid #d9e2ec;
    border-radius: 0.5rem;
    background: white;
  }
  .entry-actions label {
    display: grid;
    gap: 0.35rem;
  }
  .primary-link {
    justify-self: start;
    padding: 0.6rem 0.9rem;
    border-radius: 0.35rem;
    background: #0b7285;
    color: white;
    text-decoration: none;
  }
  section + section {
    margin-top: 2rem;
  }
</style>
