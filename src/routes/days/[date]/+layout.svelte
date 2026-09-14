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
    <div class="day-title">
      <p class="text-muted">日別シフト</p>
      <h1 id="day-title">{data.date}のシフト管理</h1>
    </div>
    <label class="field">
      対象日付
      <input
        aria-label="対象日付"
        type="date"
        value={data.date}
        onchange={(event) => handleDateChange(event.currentTarget.value)}
      />
    </label>
  </div>

  <nav class="day-nav" aria-label="日別メニュー">
    <ul class="tabs">
      {#each tabs as tab (tab.href)}
        <li>
          <a
            class="tab"
            href={tab.href}
            aria-current={activePath === tab.href ? "page" : undefined}
          >
            {tab.label}
          </a>
        </li>
      {/each}
    </ul>
    <a href="/employees">従業員管理</a>
  </nav>

  {#if children}{@render children()}{/if}
</section>

<style>
  .day-shell {
    display: grid;
    gap: var(--spacing-lg);
  }
  .day-heading {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: space-between;
    gap: var(--spacing-md);
  }
  .day-title {
    display: grid;
    gap: var(--spacing-xs);
  }
  .day-nav {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    border-bottom: 1px solid var(--screen-border-color);
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    padding: 0;
    list-style: none;
  }
  /* tab は本文中の遷移ではないので link のトークンを借りない（DESIGN.md）。 */
  .tab {
    display: block;
    /* 非色の行は尺度のキーを直接引く（DESIGN.md: tab padding = sm / md）。 */
    padding-block: var(--spacing-sm);
    padding-inline: var(--spacing-md);
    border-bottom: 3px solid transparent;
    color: var(--tab-text-color);
    font-family: var(--typography-label-font-family);
    font-size: var(--typography-label-font-size);
    font-weight: var(--typography-label-font-weight);
    line-height: var(--typography-label-line-height);
    text-decoration: none;
  }
  .tab:hover {
    color: var(--tab-text-color--hover);
  }
  .tab[aria-current="page"] {
    border-bottom-color: var(--tab-current-indicator-color);
    color: var(--tab-current-text-color);
  }
</style>
