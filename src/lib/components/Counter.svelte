<script lang="ts">
  let count = $state(0);
  let message = $state('');

  function handleClick() {
    count += 1;

    if (count >= 3) {
      message = '上限に達しました';
    }
  }
</script>

<button onclick={handleClick}>{count}</button>
{#if message}
  <p>{message}</p>
{/if}
