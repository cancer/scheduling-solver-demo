<script lang="ts">
  import { ROLES } from "$lib/domain/shift";
  import type { StoredAssignment, StoredSolution } from "$lib/domain/day";
  import type { StoredEmployee } from "$lib/api/types";
  import { heatColor } from "$lib/heatmap";
  import { isPinned } from "$lib/pinning";
  import { assignmentLabel, buildShortageGrid, shortageAriaLabel } from "$lib/schedule";

  // 求解結果のシフト表と不足人数の表示。勤務バーのクリックで固定・解除を
  // 切り替える（画面の契約）。ロジックは `$lib/schedule` と `$lib/pinning` の
  // 純関数に寄せ、ここは表示とイベント配線だけを持つ（決定5）。
  // 連続クリックの制御（求解中フラグ・拒否・古い応答の破棄）は入れない（決定7）。

  const SHORTAGE_SCALE_MAX = 3;

  let { employees, solution, pinnedAssignments, ontogglepin }: {
    employees: readonly StoredEmployee[];
    solution: StoredSolution | null;
    pinnedAssignments: readonly StoredAssignment[];
    ontogglepin: (assignment: StoredAssignment) => void;
  } = $props();

  function employeeName(employeeId: string): string {
    return employees.find((employee) => employee.id === employeeId)?.name ?? employeeId;
  }

  const shortageGrid = $derived(solution === null ? [] : buildShortageGrid(solution.shortages));
</script>

<div class="schedule-board">
  {#if solution === null}
    <p>未求解</p>
  {:else}
    <ul class="assignments">
      {#each solution.assignments as assignment, index (index)}
        <li>
          <button
            type="button"
            class="bar"
            class:pinned={isPinned(pinnedAssignments, assignment)}
            aria-pressed={isPinned(pinnedAssignments, assignment)}
            onclick={() => ontogglepin(assignment)}
          >
            {assignmentLabel(employeeName(assignment.employeeId), assignment.role, assignment.start, assignment.length)}
          </button>
        </li>
      {/each}
    </ul>

    <div class="shortages" style={`grid-template-columns: max-content repeat(${shortageGrid.length}, 1fr);`}>
      <div class="corner"></div>
      {#each shortageGrid as _, slot (slot)}
        <div class="time-header">{slot}</div>
      {/each}
      {#each ROLES as role (role)}
        <div class="role-header">{role}</div>
        {#each shortageGrid as slotShortage, slot (slot)}
          <div
            class="shortage-cell"
            style={`background-color: ${heatColor(slotShortage[role], SHORTAGE_SCALE_MAX)};`}
            aria-label={shortageAriaLabel(role, slot, slotShortage[role])}
          >
            {slotShortage[role]}
          </div>
        {/each}
      {/each}
    </div>
  {/if}
</div>

<style>
  .bar.pinned {
    outline: 2px solid black;
    font-weight: bold;
  }
  .shortages {
    display: grid;
    gap: 1px;
  }
  .shortage-cell {
    font-size: 0.7rem;
    text-align: center;
  }
</style>
