<script lang="ts">
  import { getContext, onMount } from "svelte";
  import { RESET_CONTEXT_KEY } from "$lib/reset-context";
  import type { ResetCoordinator } from "$lib/reset-context";

  let { cancel }: { cancel: () => void } = $props();
  const resetCoordinator = getContext<ResetCoordinator>(RESET_CONTEXT_KEY);

  onMount(() => {
    resetCoordinator.registerCancel(cancel);
  });
</script>
