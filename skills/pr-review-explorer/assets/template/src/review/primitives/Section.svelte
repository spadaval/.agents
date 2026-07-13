<script lang="ts">
  import type { Snippet } from "svelte";
  let { title, children }: { title?: string; children?: Snippet } = $props();
</script>

<section>
  {#if title}<h2>{title}</h2>{/if}
  <div>{@render children?.()}</div>
</section>

<style>
  section {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 10px;
    min-width: 0;
  }
  h2 {
    margin: 0;
  }
  div {
    min-width: 0;
    color: #cbd4cc;
    line-height: 1.65;
  }
  div :global(p:first-child) {
    margin-top: 0;
  }
  div :global(p:last-child) {
    margin-bottom: 0;
  }
</style>
