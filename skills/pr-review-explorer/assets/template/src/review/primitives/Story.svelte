<script lang="ts">
  import type { Snippet } from "svelte";

  let { children }: { children?: Snippet } = $props();
</script>

<article class="story">
  {@render children?.()}
</article>

<style>
  .story {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 22px;
    min-width: 0;
  }
</style>
