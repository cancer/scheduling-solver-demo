<script lang="ts">
  import { invalidateAll } from "$app/navigation";
  import { createApiClient } from "$lib/api/client";
  import type { ApiClient } from "$lib/api/client";
  import {
    createResetCoordinator,
    RESET_CONTEXT_KEY,
  } from "$lib/reset-context";
  import type { Snippet } from "svelte";
  import { setContext } from "svelte";

  let {
    children,
    apiClient = createApiClient(fetch),
  }: {
    children?: Snippet;
    apiClient?: ApiClient;
  } = $props();

  const resetCoordinator = createResetCoordinator();
  setContext(RESET_CONTEXT_KEY, resetCoordinator);
  let resetMessage = $state("");

  async function handleReset() {
    resetCoordinator.cancelPendingSaves();
    resetMessage = "初期データに戻しています…";
    try {
      await apiClient.reset();
      await invalidateAll();
      resetMessage = "初期データに戻しました";
    } catch {
      resetMessage = "初期データへの復元に失敗しました";
    }
  }
</script>

<div class="app-shell">
  <header class="app-header">
    <a href="/" class="brand">シフト管理デモ</a>
    <button type="button" onclick={handleReset}>初期データに戻す</button>
  </header>
  <main>
    {#if children}{@render children()}{/if}
  </main>
  <p class="reset-message" aria-live="polite">{resetMessage}</p>
</div>

<style>
  :global(body) {
    margin: 0;
    color: #172033;
    background: #f6f8fb;
    font-family:
      system-ui,
      -apple-system,
      BlinkMacSystemFont,
      "Segoe UI",
      sans-serif;
  }
  .app-shell {
    min-height: 100vh;
  }
  .app-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem max(1rem, calc((100vw - 72rem) / 2));
    background: #102a43;
    color: white;
  }
  .brand {
    color: inherit;
    font-weight: 700;
    text-decoration: none;
  }
  .app-header button {
    border: 1px solid #d9e2ec;
    border-radius: 0.35rem;
    padding: 0.45rem 0.7rem;
    background: white;
    color: #102a43;
    cursor: pointer;
  }
  main {
    width: min(72rem, calc(100% - 2rem));
    margin: 0 auto;
    padding: 2rem 0 4rem;
  }
  .reset-message {
    position: fixed;
    right: 1rem;
    bottom: 1rem;
    margin: 0;
    color: #334e68;
  }
</style>
