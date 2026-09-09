<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import type { DayPageData } from "$lib/api/loaders";
  import type { Snippet } from "svelte";

  type Tab = Readonly<{ href: string; label: string }>;

  let {
    data,
    children,
    currentPath,
  }: {
    data: Pick<DayPageData, "date">;
    children?: Snippet;
    currentPath?: string;
  } = $props();

  const tabs = $derived([
    { href: `/days/${data.date}/requirements`, label: "必要人数" },
    { href: `/days/${data.date}/availability`, label: "出勤可能時間帯" },
    { href: `/days/${data.date}/schedule`, label: "シフト表・求解" },
  ] satisfies readonly Tab[]);
  const activePath = $derived(currentPath ?? page.url.pathname);

  async function handleDateChange(nextDate: string) {
    if (nextDate === "") {
      return;
    }
    const activeTab = tabs.find((tab) => tab.href === activePath) ?? tabs[0];
    await goto(`${activeTab.href.replace(data.date, nextDate)}`);
  }
</script>

<svelte:head><title>{data.date} | シフト管理デモ</title></svelte:head>

<section class="day-shell" aria-labelledby="day-title">
  <div class="day-heading">
    <div>
      <p class="eyebrow">日別シフト</p>
      <h1 id="day-title">対象日付</h1>
    </div>
    <label>
      対象日付
      <input
        aria-label="対象日付"
        type="date"
        value={data.date}
        onchange={(event) => handleDateChange(event.currentTarget.value)}
      />
    </label>
  </div>

  <nav aria-label="日別メニュー">
    <ul class="tabs">
      {#each tabs as tab (tab.href)}
        <li>
          <a href={tab.href} aria-current={activePath === tab.href ? "page" : undefined}>
            {tab.label}
          </a>
        </li>
      {/each}
    </ul>
  </nav>

  <a href="/employees">従業員管理</a>

  {#if children}{@render children()}{/if}
</section>

<style>
  .day-shell {
    display: grid;
    gap: 1.25rem;
  }
  .day-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
  }
  .day-heading label {
    display: grid;
    gap: 0.35rem;
  }
  .eyebrow {
    margin: 0;
    color: #627d98;
    font-size: 0.85rem;
  }
  h1 {
    margin: 0;
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
    border-bottom: 1px solid #bcccdc;
  }
  .tabs a {
    display: block;
    padding: 0.65rem 0.85rem;
    color: #334e68;
    text-decoration: none;
  }
  .tabs a[aria-current="page"] {
    border-bottom: 3px solid #0b7285;
    color: #102a43;
    font-weight: 700;
  }
</style>
