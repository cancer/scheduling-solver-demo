<script lang="ts">
  import RootLayout from "./+layout.svelte";
  import ResetRegistrationProbe from "./reset-registration-probe.svelte";
  import type { ApiClient } from "$lib/api/client";

  let {
    apiClient,
    cancel,
  }: {
    apiClient: ApiClient;
    cancel: () => void;
  } = $props();
</script>

<RootLayout {apiClient}>
  {#snippet children()}
    <ResetRegistrationProbe {cancel} />
  {/snippet}
</RootLayout>
