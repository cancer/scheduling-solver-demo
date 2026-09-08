<script lang="ts">
  import { ROLES } from "$lib/domain/shift";
  import { roleLabel } from "$lib/heatmap";
  import { addEmployee, removeEmployee, toggleRole, updateEmployee } from "$lib/employees";
  import type { StoredEmployee } from "$lib/api/types";

  // 従業員管理（一覧・追加・編集・削除）。ロジックは `$lib/employees` の純関数に
  // 寄せ、ここは表示とイベント配線だけを持つ（決定5）。

  const DEFAULT_MIN_SHIFT_LENGTH = 8;
  const DEFAULT_MAX_SHIFT_LENGTH = 16;

  let { employees, onchange }: {
    employees: readonly StoredEmployee[];
    onchange: (next: readonly StoredEmployee[]) => void;
  } = $props();

  let newName = $state("");

  function handleAdd() {
    const name = newName.trim();
    if (name === "") {
      return;
    }
    const employee: StoredEmployee = {
      id: crypto.randomUUID(),
      name,
      roles: [],
      minShiftLength: DEFAULT_MIN_SHIFT_LENGTH,
      maxShiftLength: DEFAULT_MAX_SHIFT_LENGTH,
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
</script>

<div class="employee-manager">
  <ul>
    {#each employees as employee (employee.id)}
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
