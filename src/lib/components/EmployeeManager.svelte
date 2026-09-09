<script lang="ts">
  import {
    MAX_SHIFT_LENGTH,
    MIN_SHIFT_LENGTH,
    ROLES,
    SLOT_COUNT,
  } from "$lib/domain/shift";
  import { roleLabel } from "$lib/heatmap";
  import {
    addEmployee,
    hoursToShiftLength,
    isValidShiftLengthRange,
    removeEmployee,
    shiftLengthToHours,
    toggleRole,
    updateEmployee,
  } from "$lib/employees";
  import type { StoredEmployee } from "$lib/api/types";

  // 従業員管理（一覧・追加・編集・削除）。ロジックは `$lib/employees` の純関数に
  // 寄せ、ここは表示とイベント配線だけを持つ（決定5）。

  let { employees, onchange }: {
    employees: readonly StoredEmployee[];
    onchange: (next: readonly StoredEmployee[]) => void;
  } = $props();

  let newName = $state("");
  let lengthDrafts = $state<Record<string, { min: string; max: string }>>({});
  let lengthErrors = $state<Record<string, string>>({});

  function handleAdd() {
    const name = newName.trim();
    if (name === "") {
      return;
    }
    const employee: StoredEmployee = {
      id: crypto.randomUUID(),
      name,
      roles: [],
      minShiftLength: MIN_SHIFT_LENGTH,
      maxShiftLength: MAX_SHIFT_LENGTH,
    };
    onchange(addEmployee(employees, employee));
    newName = "";
  }

  function handleRemove(id: string) {
    onchange(removeEmployee(employees, id));
  }

  function handleToggleRole(employee: StoredEmployee, role: (typeof ROLES)[number]) {
    onchange(updateEmployee(employees, employee.id, { roles: toggleRole(employee.roles, role) }));
  }

  function handleRename(employee: StoredEmployee, name: string) {
    onchange(updateEmployee(employees, employee.id, { name }));
  }

  function lengthDraft(employee: StoredEmployee): { min: string; max: string } {
    return (
      lengthDrafts[employee.id] ?? {
        min: String(shiftLengthToHours(employee.minShiftLength)),
        max: String(shiftLengthToHours(employee.maxShiftLength)),
      }
    );
  }

  function handleLengthChange(
    employee: StoredEmployee,
    field: "min" | "max",
    rawValue: string,
  ) {
    const current = lengthDraft(employee);
    const next = { ...current, [field]: rawValue };
    lengthDrafts[employee.id] = next;

    const minLength = hoursToShiftLength(Number(next.min));
    const maxLength = hoursToShiftLength(Number(next.max));
    if (
      minLength === null ||
      maxLength === null ||
      !isValidShiftLengthRange(minLength, maxLength)
    ) {
      lengthErrors[employee.id] = "勤務長さの下限は上限以下で、0.5〜14時間にしてください";
      return;
    }

    delete lengthErrors[employee.id];
    onchange(
      updateEmployee(employees, employee.id, {
        minShiftLength: minLength,
        maxShiftLength: maxLength,
      }),
    );
  }
</script>

<div class="employee-manager">
  <ul>
    {#each employees as employee (employee.id)}
      {@const draft = lengthDraft(employee)}
      <li>
        <input
          type="text"
          value={employee.name}
          aria-label={`${employee.name}の名前`}
          onchange={(event) => handleRename(employee, event.currentTarget.value)}
        />
        {#each ROLES as role (role)}
          <label>
            <input
              type="checkbox"
              checked={employee.roles.includes(role)}
              aria-label={`${employee.name} ${roleLabel(role)}`}
              onchange={() => handleToggleRole(employee, role)}
            />
            {roleLabel(role)}
          </label>
        {/each}
        <label>
          勤務長さ下限（時間）
          <input
            type="number"
            min="0.5"
            max={SLOT_COUNT / 2}
            step="0.5"
            value={draft.min}
            aria-label={`${employee.name} 勤務長さ下限（時間）`}
            aria-invalid={lengthErrors[employee.id] !== undefined}
            onchange={(event) => handleLengthChange(employee, "min", event.currentTarget.value)}
          />
        </label>
        <label>
          勤務長さ上限（時間）
          <input
            type="number"
            min="0.5"
            max={SLOT_COUNT / 2}
            step="0.5"
            value={draft.max}
            aria-label={`${employee.name} 勤務長さ上限（時間）`}
            aria-invalid={lengthErrors[employee.id] !== undefined}
            onchange={(event) => handleLengthChange(employee, "max", event.currentTarget.value)}
          />
        </label>
        {#if lengthErrors[employee.id] !== undefined}
          <p class="length-error" role="alert">{lengthErrors[employee.id]}</p>
        {/if}
        <button type="button" onclick={() => handleRemove(employee.id)}>
          {employee.name}を削除
        </button>
      </li>
    {/each}
  </ul>

  <div class="add-form">
    <label>
      新しい従業員名
      <input type="text" bind:value={newName} />
    </label>
    <button type="button" onclick={handleAdd}>追加</button>
  </div>
</div>

<style>
  .employee-manager {
    display: grid;
    gap: 1rem;
  }
  li {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  .length-error {
    flex-basis: 100%;
    color: #a40000;
  }
</style>
