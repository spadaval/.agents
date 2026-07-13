<script lang="ts">
  import type { Snippet } from "svelte";
  let {
    title,
    tone = "note",
    children,
  }: {
    title?: string;
    tone?: "note" | "warning";
    children?: Snippet;
  } = $props();
</script>

<aside class:warning={tone === "warning"}>
  {#if title}<strong>{title}</strong>{/if}
  <div>{@render children?.()}</div>
</aside>

<style>
  aside {
    padding: 14px 16px;
    color: #dce8de;
    background: #18251c;
    border-left: 3px solid var(--green);
    border-radius: 3px;
  }
  aside.warning {
    background: #282219;
    border-left-color: #e4b76b;
  }
  strong {
    display: block;
    margin-bottom: 5px;
    color: #f0f6ef;
  }
  div {
    font-size: 13px;
    line-height: 1.55;
  }
</style>
