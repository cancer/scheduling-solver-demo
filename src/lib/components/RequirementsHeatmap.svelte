<script lang="ts">
  import { ROLES } from "$lib/domain/shift";
  import type { SlotRequirements } from "$lib/domain/shift";
  import {
    adjustCount,
    cellAriaLabel,
    heatLevel,
    isHourlySlot,
    roleLabel,
    setRequirement,
    slotStartLabel,
  } from "$lib/heatmap";

  // 必要人数ヒートマップ（決定17）。ロジックは `$lib/heatmap` の純関数に寄せ、
  // ここは表示とイベント配線だけを持つ（決定5）。
  // ドラッグで塗った内容は離した時点でまとめて `oncommit` する（決定18）。
  // キーボード操作（矢印キーで増減）と読み上げ（役割・時刻・人数のラベル）の
  // 経路は決定17が払うと認めた代償であり、外さない。
  // 色は DESIGN.md の heat-cell トークンが持つ。ここは段（level）だけを当てる。

  const MAX_LEVEL = 5;

  let { requirements, oncommit }: {
    requirements: readonly SlotRequirements[];
    oncommit: (next: readonly SlotRequirements[]) => void;
  } = $props();

  let brushValue = $state(1);
  let painting = $state(false);
  let draft = $state<readonly SlotRequirements[] | null>(null);

  const displayed = $derived(draft ?? requirements);

  function paintCell(role: (typeof ROLES)[number], slot: number) {
    draft = setRequirement(draft ?? requirements, role, slot, brushValue);
  }

  function startPaint(role: (typeof ROLES)[number], slot: number) {
    painting = true;
    paintCell(role, slot);
  }

  function continuePaint(role: (typeof ROLES)[number], slot: number, buttons: number) {
    if (!painting || buttons !== 1) {
      return;
    }
    paintCell(role, slot);
  }

  function endPaint() {
    if (!painting) {
      return;
    }
    painting = false;
    if (draft !== null) {
      oncommit(draft);
      draft = null;
    }
  }

  function handleKeydown(event: KeyboardEvent, role: (typeof ROLES)[number], slot: number) {
    const delta = event.key === "ArrowUp" ? 1 : event.key === "ArrowDown" ? -1 : 0;
    if (delta === 0) {
      return;
    }
    event.preventDefault();
    const current = requirements[slot][role];
    oncommit(setRequirement(requirements, role, slot, adjustCount(current, delta)));
  }
</script>

<svelte:window onpointerup={endPaint} />

<div class="heatmap">
  <label class="field brush">
    塗る値
    <input type="number" min="0" max="99" bind:value={brushValue} />
  </label>

  <div class="scroll-container">
    <div class="grid">
      <div class="corner"></div>
      {#each displayed as _, slot (slot)}
        <div
          class="time-header"
          class:hourly={isHourlySlot(slot)}
          class:intermediate={!isHourlySlot(slot)}
        >
          {#if isHourlySlot(slot)}{slotStartLabel(slot)}{/if}
        </div>
      {/each}

      {#each ROLES as role (role)}
        <div class="role-header">{roleLabel(role)}</div>
        {#each displayed as requirement, slot (slot)}
          <button
            type="button"
            class="cell"
            data-level={heatLevel(requirement[role], MAX_LEVEL)}
            aria-label={cellAriaLabel(role, slot, requirement[role])}
            onpointerdown={() => startPaint(role, slot)}
            onpointerenter={(event) => continuePaint(role, slot, event.buttons)}
            onkeydown={(event) => handleKeydown(event, role, slot)}
          >
            {requirement[role]}
          </button>
        {/each}
      {/each}
    </div>
  </div>
</div>

<style>
  .heatmap {
    display: grid;
    gap: var(--spacing-md);
    width: 100%;
    min-width: 0;
  }
  .brush {
    width: 8rem;
  }
  .grid {
    display: grid;
    /* main is capped at 72rem, so flexible tracks keep all 28 slots inside it on desktop. */
    width: 100%;
    min-width: 0;
    /* The shared 7rem label track fits role labels and keeps every time column aligned; long labels wrap inside it. */
    grid-template-columns: 7rem repeat(28, minmax(0, 1fr));
    /* 1px の隙間から地が透けることで格子線になる。線の色はトークンで引く。 */
    gap: 1px;
    background: var(--grid-line-color);
    border: 1px solid var(--grid-line-color);
  }
  .scroll-container {
    min-width: 0;
    max-width: 100%;
    overflow-x: auto;
  }
  .cell {
    min-width: 0;
    border: none;
    padding-block: var(--spacing-xs);
    padding-inline: 0;
    font-family: var(--typography-caption-font-family);
    font-size: var(--typography-caption-font-size);
    font-weight: var(--typography-caption-font-weight);
    line-height: var(--typography-caption-line-height);
    cursor: pointer;
  }
  .cell[data-level="0"] {
    background: var(--heat-cell-level-0-surface-color);
    color: var(--heat-cell-level-0-text-color);
  }
  .cell[data-level="1"] {
    background: var(--heat-cell-level-1-surface-color);
    color: var(--heat-cell-level-1-text-color);
  }
  .cell[data-level="2"] {
    background: var(--heat-cell-level-2-surface-color);
    color: var(--heat-cell-level-2-text-color);
  }
  .cell[data-level="3"] {
    background: var(--heat-cell-level-3-surface-color);
    color: var(--heat-cell-level-3-text-color);
  }
  .cell[data-level="4"] {
    background: var(--heat-cell-level-4-surface-color);
    color: var(--heat-cell-level-4-text-color);
  }
  .cell[data-level="5"] {
    background: var(--heat-cell-level-5-surface-color);
    color: var(--heat-cell-level-5-text-color);
  }
  .role-header,
  .time-header,
  .corner {
    min-width: 0;
    padding: var(--spacing-xs);
    color: var(--grid-header-text-color);
    font-family: var(--typography-caption-font-family);
    font-size: var(--typography-caption-font-size);
    font-weight: var(--typography-caption-font-weight);
    line-height: var(--typography-caption-line-height);
  }
  .time-header {
    text-align: center;
    white-space: nowrap;
  }
  .time-header.hourly {
    grid-column: span 2;
  }
  .time-header.intermediate {
    display: none;
  }
  .role-header,
  .corner {
    background: var(--screen-surface-color);
    overflow-wrap: anywhere;
  }
  .time-header {
    background: var(--screen-surface-color);
  }

  @media (max-width: 66.75rem) {
    /*
     * Flexible columns start only above this calculated boundary: 7rem label +
     * 28 × 2rem readable slots + 28 × 1px gaps + 2rem main side margins =
     * 7rem + 56rem + 1.75rem + 2rem = 66.75rem (at the default 16px root size).
     * A 2rem slot leaves room for a two-digit count at the component's font size
     * and horizontal padding; below the boundary, the 4.25rem slots scroll instead.
     */
    .scroll-container {
      overflow-x: auto;
    }
    .grid {
      width: max-content;
      min-width: max-content;
      grid-template-columns: 7rem repeat(28, minmax(4.25rem, 1fr));
    }
    .role-header,
    .corner {
      position: sticky;
      left: 0;
      z-index: 1;
    }
  }
</style>
