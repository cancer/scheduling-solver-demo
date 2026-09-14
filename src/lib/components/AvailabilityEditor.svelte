<script lang="ts">
  import { SLOT_COUNT } from "$lib/domain/shift";
  import type { DayAvailability } from "$lib/domain/day";
  import type { StoredEmployee } from "$lib/api/types";
  import { isOff, setEmployeeAvailability } from "$lib/availability";
  import { slotStartLabel } from "$lib/heatmap";

  // 従業員ごとの当日の出勤可能時間帯入力。ロジックは `$lib/availability` の
  // 純関数に寄せ、ここは表示とイベント配線だけを持つ（決定5）。

  let { employees, availability, oncommit }: {
    employees: readonly StoredEmployee[];
    availability: DayAvailability;
    oncommit: (next: DayAvailability) => void;
  } = $props();

  const startOptions = Array.from({ length: SLOT_COUNT }, (_, slot) => slot);
  const endOptions = Array.from({ length: SLOT_COUNT }, (_, slot) => slot + 1);

  function handleToggleOff(employeeId: string, checked: boolean) {
    oncommit(setEmployeeAvailability(availability, employeeId, checked ? { start: 0, end: SLOT_COUNT } : null));
  }

  // 呼び出し元（テンプレート）は `availability[employee.id]` が存在する分岐でのみ
  // これらを呼ぶため、`window` は常に定義済み。呼び出し元から渡してもらうことで
  // ここで再度未定義チェックをする必要をなくす。
  function handleStartChange(
    employeeId: string,
    window: Readonly<{ start: number; end: number }>,
    start: number,
  ) {
    oncommit(setEmployeeAvailability(availability, employeeId, { ...window, start }));
  }

  function handleEndChange(
    employeeId: string,
    window: Readonly<{ start: number; end: number }>,
    end: number,
  ) {
    oncommit(setEmployeeAvailability(availability, employeeId, { ...window, end }));
  }
</script>

<ul class="availability-editor">
  {#each employees as employee (employee.id)}
    <li class="card employee-row">
      <span class="employee-name">{employee.name}</span>
      <label class="field-inline">
        <input
          type="checkbox"
          checked={!isOff(availability, employee.id)}
          aria-label={`${employee.name} 出勤`}
          onchange={(event) => handleToggleOff(employee.id, event.currentTarget.checked)}
        />
        出勤
      </label>
      {#if availability[employee.id] !== undefined}
        {@const window = availability[employee.id]}
        <label class="field-inline">
          開始
          <select
            aria-label={`${employee.name} 開始`}
            value={window.start}
            onchange={(event) =>
              handleStartChange(employee.id, window, Number(event.currentTarget.value))}
          >
            {#each startOptions as slot (slot)}
              <option value={slot}>{slotStartLabel(slot)}</option>
            {/each}
          </select>
        </label>
        <label class="field-inline">
          終了
          <select
            aria-label={`${employee.name} 終了`}
            value={window.end}
            onchange={(event) =>
              handleEndChange(employee.id, window, Number(event.currentTarget.value))}
          >
            {#each endOptions as slot (slot)}
              <option value={slot}>{slotStartLabel(slot)}</option>
            {/each}
          </select>
        </label>
      {/if}
    </li>
  {/each}
</ul>

<style>
  .availability-editor {
    display: grid;
    gap: var(--spacing-sm);
    list-style: none;
  }
  .employee-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    /* 関係の近い入力どうしは近づけ、行どうしはカードで分ける（近接）。 */
    gap: var(--spacing-md);
  }
  .employee-name {
    min-width: 6rem;
    font-family: var(--typography-label-font-family);
    font-size: var(--typography-label-font-size);
    font-weight: var(--typography-label-font-weight);
    line-height: var(--typography-label-line-height);
  }
</style>
