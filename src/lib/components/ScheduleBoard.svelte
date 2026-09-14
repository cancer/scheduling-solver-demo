<script lang="ts">
  import { ROLES, SLOT_COUNT } from "$lib/domain/shift";
  import type { StoredAssignment, StoredSolution } from "$lib/domain/day";
  import type { StoredEmployee } from "$lib/api/types";
  import { heatLevel, isHourlySlot, roleLabel, slotStartLabel } from "$lib/heatmap";
  import { isPinned } from "$lib/pinning";
  import {
    assignmentBarStyle,
    assignmentLabel,
    buildShortageGrid,
    shortageAriaLabel,
  } from "$lib/schedule";

  // 求解結果のシフト表と不足人数の表示。勤務バーのクリックで固定・解除を
  // 切り替える（画面の契約）。ロジックは `$lib/schedule` と `$lib/pinning` の
  // 純関数に寄せ、ここは表示とイベント配線だけを持つ（決定5）。
  // 連続クリックの制御（求解中フラグ・拒否・古い応答の破棄）は入れない（決定7）。
  // 色は DESIGN.md の shortage-cell / shift-bar トークンが持つ。ここは段と
  // variant（固定の有無）だけを当てる。

  const SHORTAGE_MAX_LEVEL = 3;
  const timelineSlots = Array.from({ length: SLOT_COUNT }, (_, slot) => slot);

  let { employees, solution, pinnedAssignments, ontogglepin }: {
    employees: readonly StoredEmployee[];
    solution: StoredSolution | null;
    pinnedAssignments: readonly StoredAssignment[];
    ontogglepin: (assignment: StoredAssignment) => void;
  } = $props();

  function employeeName(employeeId: string): string {
    return employees.find((employee) => employee.id === employeeId)?.name ?? employeeId;
  }

  function assignmentRowLabel(assignment: StoredAssignment): string {
    return `${employeeName(assignment.employeeId)} / ${roleLabel(assignment.role)}`;
  }

  const shortageGrid = $derived(solution === null ? [] : buildShortageGrid(solution.shortages));
</script>

<div class="schedule-board">
  {#if solution === null}
    <p class="note note-neutral">未求解</p>
  {:else}
    <section class="board-section" aria-labelledby="assignments-heading">
      <h2 id="assignments-heading">勤務割当</h2>
      <div class="timeline-scroll">
        <div class="timeline">
          <div class="timeline-row timeline-header">
            <div class="row-label">従業員 / 役割</div>
            <div class="track track-header">
              {#each timelineSlots as slot (slot)}
                <div
                  class="time-header"
                  class:hourly={isHourlySlot(slot)}
                  class:intermediate={!isHourlySlot(slot)}
                >
                  {#if isHourlySlot(slot)}{slotStartLabel(slot)}{/if}
                </div>
              {/each}
            </div>
          </div>

          {#each solution.assignments as assignment, index (`${assignment.employeeId}-${assignment.role}-${assignment.start}-${index}`)}
            <div class="timeline-row assignment-row">
              <div class="row-label">{assignmentRowLabel(assignment)}</div>
              <div class="track">
                {#each timelineSlots as slot (slot)}
                  <div class="track-slot" aria-hidden="true"></div>
                {/each}
                <button
                  type="button"
                  class="bar"
                  class:pinned={isPinned(pinnedAssignments, assignment)}
                  aria-pressed={isPinned(pinnedAssignments, assignment)}
                  aria-label={assignmentLabel(
                    employeeName(assignment.employeeId),
                    assignment.role,
                    assignment.start,
                    assignment.length,
                  )}
                  title={assignmentLabel(
                    employeeName(assignment.employeeId),
                    assignment.role,
                    assignment.start,
                    assignment.length,
                  )}
                  style={assignmentBarStyle(assignment)}
                  onclick={() => ontogglepin(assignment)}
                >
                  {assignmentLabel(
                    employeeName(assignment.employeeId),
                    assignment.role,
                    assignment.start,
                    assignment.length,
                  )}
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    </section>

    <section class="board-section" aria-labelledby="shortages-heading">
      <h2 id="shortages-heading">不足人数</h2>
      <div class="shortage-scroll">
        <div class="shortages">
          <div class="corner"></div>
          {#each shortageGrid as _, slot (slot)}
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
            {#each shortageGrid as slotShortage, slot (slot)}
              <div
                class="shortage-cell"
                data-level={heatLevel(slotShortage[role], SHORTAGE_MAX_LEVEL)}
                aria-label={shortageAriaLabel(role, slot, slotShortage[role])}
              >
                {slotShortage[role]}
              </div>
            {/each}
          {/each}
        </div>
      </div>
    </section>
  {/if}
</div>

<style>
  .schedule-board {
    display: grid;
    width: 100%;
    gap: var(--spacing-xl);
    min-width: 0;
  }
  .board-section {
    display: grid;
    gap: var(--spacing-sm);
    min-width: 0;
  }
  .board-section h2 {
    font-family: var(--typography-label-font-family);
    font-size: var(--typography-label-font-size);
    font-weight: var(--typography-label-font-weight);
    line-height: var(--typography-label-line-height);
    color: var(--screen-text-muted-color);
  }
  .timeline-scroll,
  .shortage-scroll {
    min-width: 0;
    max-width: 100%;
    overflow-x: auto;
  }
  .timeline {
    /* main is capped at 72rem; flexible tracks prevent desktop content from widening past it. */
    width: 100%;
    min-width: 0;
    border: 1px solid var(--grid-line-color);
    background: var(--screen-surface-color);
  }
  .timeline-row {
    display: grid;
    width: 100%;
    min-width: 0;
    /* The shared 7rem label track fits row labels and keeps the header and every assignment aligned. */
    grid-template-columns: 7rem minmax(0, 1fr);
    gap: 1px;
  }
  .row-label {
    min-width: 0;
    padding: var(--spacing-sm);
    background: var(--screen-surface-color);
    border-right: 1px solid var(--grid-line-color);
    border-bottom: 1px solid var(--grid-line-color);
    font-family: var(--typography-body-sm-font-family);
    font-size: var(--typography-body-sm-font-size);
    font-weight: var(--typography-body-sm-font-weight);
    line-height: var(--typography-body-sm-line-height);
    overflow-wrap: anywhere;
  }
  .track {
    position: relative;
    display: grid;
    width: 100%;
    min-width: 0;
    grid-template-columns: repeat(28, minmax(0, 1fr));
    gap: 1px;
    min-height: 3.5rem;
  }
  .track-header {
    min-height: 2rem;
  }
  .time-header {
    min-width: 0;
    min-height: 2rem;
    padding: var(--spacing-xs);
    color: var(--grid-header-text-color);
    font-family: var(--typography-caption-font-family);
    font-size: var(--typography-caption-font-size);
    font-weight: var(--typography-caption-font-weight);
    line-height: var(--typography-caption-line-height);
    text-align: center;
    white-space: nowrap;
  }
  .time-header.hourly {
    grid-column: span 2;
  }
  .time-header.intermediate {
    display: none;
  }
  .track-slot {
    grid-row: 1;
    min-width: 0;
    min-height: 3.5rem;
    border-left: 1px solid var(--grid-line-color);
    border-bottom: 1px solid var(--grid-line-color);
  }
  /* shift-bar。固定の有無は variant なので、色そのものを差し替える
     （枠線の追加や太字のような後付けの差分にしない）。 */
  .bar {
    grid-row: 1;
    align-self: center;
    z-index: 1;
    min-width: 0;
    margin: var(--spacing-xs);
    overflow: hidden;
    border: 1px solid var(--shift-bar-free-border-color);
    border-radius: var(--rounded-sm);
    padding-block: var(--spacing-xs);
    padding-inline: var(--spacing-sm);
    background: var(--shift-bar-free-surface-color);
    color: var(--shift-bar-free-text-color);
    font-family: var(--typography-label-font-family);
    font-size: var(--typography-label-font-size);
    font-weight: var(--typography-label-font-weight);
    line-height: var(--typography-label-line-height);
    cursor: pointer;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .bar.pinned {
    border-color: var(--shift-bar-pinned-border-color);
    background: var(--shift-bar-pinned-surface-color);
    color: var(--shift-bar-pinned-text-color);
  }
  .shortages {
    display: grid;
    width: 100%;
    min-width: 0;
    grid-template-columns: 7rem repeat(28, minmax(0, 1fr));
    /* 1px の隙間から地が透けることで格子線になる。線の色はトークンで引く。 */
    gap: 1px;
    background: var(--grid-line-color);
    border: 1px solid var(--grid-line-color);
  }
  .shortage-cell {
    min-width: 0;
    min-height: 2rem;
    padding: var(--spacing-xs);
    font-family: var(--typography-caption-font-family);
    font-size: var(--typography-caption-font-size);
    font-weight: var(--typography-caption-font-weight);
    line-height: var(--typography-caption-line-height);
    text-align: center;
  }
  .shortage-cell[data-level="0"] {
    background: var(--shortage-cell-level-0-surface-color);
    color: var(--shortage-cell-level-0-text-color);
  }
  .shortage-cell[data-level="1"] {
    background: var(--shortage-cell-level-1-surface-color);
    color: var(--shortage-cell-level-1-text-color);
  }
  .shortage-cell[data-level="2"] {
    background: var(--shortage-cell-level-2-surface-color);
    color: var(--shortage-cell-level-2-text-color);
  }
  .shortage-cell[data-level="3"] {
    background: var(--shortage-cell-level-3-surface-color);
    color: var(--shortage-cell-level-3-text-color);
  }
  .role-header,
  .corner {
    min-width: 0;
    padding-block: var(--spacing-xs);
    padding-inline: var(--spacing-sm);
    background: var(--screen-surface-color);
    color: var(--grid-header-text-color);
    font-family: var(--typography-caption-font-family);
    font-size: var(--typography-caption-font-size);
    font-weight: var(--typography-caption-font-weight);
    line-height: var(--typography-caption-line-height);
    overflow-wrap: anywhere;
  }
  .shortages .time-header {
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
    .timeline-scroll,
    .shortage-scroll {
      overflow-x: auto;
    }
    .timeline {
      width: max-content;
      min-width: max-content;
    }
    .timeline-row {
      grid-template-columns: 7rem minmax(calc(28 * 4.25rem), 1fr);
    }
    .track {
      width: auto;
      min-width: calc(28 * 4.25rem);
      grid-template-columns: repeat(28, minmax(4.25rem, 1fr));
    }
    .shortages {
      width: max-content;
      min-width: max-content;
      grid-template-columns: 7rem repeat(28, minmax(4.25rem, 1fr));
    }
    .row-label,
    .role-header,
    .corner {
      position: sticky;
      left: 0;
      z-index: 2;
    }
    .role-header,
    .corner {
      z-index: 1;
    }
  }
</style>
