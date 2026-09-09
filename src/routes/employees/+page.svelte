<script lang="ts">
  import EmployeeManager from "$lib/components/EmployeeManager.svelte";
  import { createApiClient } from "$lib/api/client";
  import type { ApiClient } from "$lib/api/client";
  import type { EmployeesPageData } from "$lib/api/loaders";
  import type { StoredEmployee } from "$lib/api/types";
  import { untrack } from "svelte";

  let {
    data,
    apiClient = createApiClient(fetch),
  }: {
    data: EmployeesPageData;
    apiClient?: ApiClient;
  } = $props();

  let employees = $state<readonly StoredEmployee[]>(untrack(() => data.employees));

  $effect(() => {
    employees = data.employees;
  });

  function handleEmployeesChange(next: readonly StoredEmployee[]) {
    employees = next;
    void apiClient.putEmployees(next);
  }
</script>

<svelte:head><title>従業員 | シフト管理デモ</title></svelte:head>

<h1>従業員</h1>
<p>従業員マスタは日付をまたいで共有されます。</p>
<p>名前・担当できる役割・勤務長さの下限と上限を編集すると自動保存されます。</p>

<EmployeeManager employees={employees} onchange={handleEmployeesChange} />
