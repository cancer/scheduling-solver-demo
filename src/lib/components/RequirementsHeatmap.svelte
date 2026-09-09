<script lang="ts">
  import { ROLES } from "$lib/domain/shift";
  import type { SlotRequirements } from "$lib/domain/shift";
  import {
    adjustCount,
    cellAriaLabel,
    heatColor,
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

  const SCALE_MAX = 6;

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
  <label>
    塗る値
    <input type="number" min="0" max="99" bind:value={brushValue} />
  </label>

  <div class="scroll-container">
    <div
      class="grid"
      style={`grid-template-columns: minmax(7rem, max-content) repeat(${requirements.length}, minmax(4.25rem, 1fr));`}
    >
      <div class="corner"></div>
      {#each displayed as _, slot (slot)}
        <div class="time-header">{#if isHourlySlot(slot)}{slotStartLabel(slot)}{/if}</div>
      {/each}

      {#each ROLES as role (role)}
        <div class="role-header">{roleLabel(role)}</div>
        {#each displayed as requirement, slot (slot)}
          <button
            type="button"
            class="cell"
            style={`background-color: ${heatColor(requirement[role], SCALE_MAX)};`}
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
  .grid {
    display: grid;
    gap: 1px;
    min-width: max-content;
  }
  .scroll-container {
    max-width: 100%;
    overflow-x: auto;
  }
  .cell {
    border: none;
    font-size: 0.75rem;
    padding: 0.25rem 0;
    cursor: pointer;
  }
  .cell:focus-visible {
    outline: 3px solid #111;
    outline-offset: -3px;
  }
  .role-header,
  .time-header,
  .corner {
    font-size: 0.7rem;
    padding: 0.25rem;
  }
  .role-header,
  .corner {
    position: sticky;
    left: 0;
    z-index: 1;
    background: white;
  }
</style>
