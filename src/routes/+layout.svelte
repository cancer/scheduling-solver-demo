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
  import "$lib/styles/tokens.css";
  import "$lib/styles/base.css";

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
  // note の variant（DESIGN.md の状態役割）。進行中は状態を主張しない neutral にする。
  let resetVariant = $state<"neutral" | "success" | "danger">("neutral");

  async function handleReset() {
    resetCoordinator.cancelPendingSaves();
    resetVariant = "neutral";
    resetMessage = "初期データに戻しています…";
    try {
      await apiClient.reset();
      await invalidateAll();
      resetVariant = "success";
      resetMessage = "初期データに戻しました";
    } catch {
      resetVariant = "danger";
      resetMessage = "初期データへの復元に失敗しました";
    }
  }
</script>

<div class="app-shell">
  <header class="appbar">
    <a href="/" class="brand">シフト管理デモ</a>
    <button type="button" class="button button-danger" onclick={handleReset}>
      初期データに戻す
    </button>
  </header>

  <main>
    {#if children}{@render children()}{/if}
  </main>

  <div class="reset-status" aria-live="polite">
    {#if resetMessage !== ""}
      <p class="note note-{resetVariant}">{resetMessage}</p>
    {/if}
  </div>
</div>

<style>
  .app-shell {
    min-height: 100vh;
  }
  .appbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-md);
    /* 非色の行は尺度のキーを直接引く（DESIGN.md: appbar padding = md / lg）。 */
    padding-block: var(--spacing-md);
    padding-inline: max(var(--spacing-lg), calc((100vw - 72rem) / 2));
    background: var(--appbar-surface-color);
    color: var(--appbar-text-color);
  }
  .brand {
    color: inherit;
    font-family: var(--typography-h3-font-family);
    font-size: var(--typography-h3-font-size);
    font-weight: var(--typography-h3-font-weight);
    line-height: var(--typography-h3-line-height);
    text-decoration: none;
  }
  main {
    width: min(72rem, calc(100% - var(--spacing-xl)));
    margin: 0 auto;
    padding-block: var(--spacing-xl) var(--spacing-3xl);
  }
  .reset-status {
    position: fixed;
    right: var(--spacing-md);
    bottom: var(--spacing-md);
  }
</style>
