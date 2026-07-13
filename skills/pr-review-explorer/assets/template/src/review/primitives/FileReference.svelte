<script lang="ts">
  import type { Snippet } from "svelte";
  import { useReviewRuntime } from "../context";

  let { path, children }: { path: string; children?: Snippet } = $props();
  const review = useReviewRuntime();
  const file = $derived(
    review.files().find((candidate) => candidate.path === path),
  );
</script>

<a
  class:missing={!file}
  href={review.fileHref(path)}
  onclick={(event) => {
    if (!file) return event.preventDefault();
    event.preventDefault();
    review.openFile(path);
  }}
>
  <code>{path}</code>
  {#if file}<small><em>+{file.additions}</em> <i>−{file.deletions}</i></small
    >{:else}<small>Not present in the fetched change set</small>{/if}
  {#if children}<span>{@render children()}</span>{/if}
</a>

<style>
  a {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 5px 12px;
    padding: 10px 12px;
    color: inherit;
    text-decoration: none;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 4px;
  }
  a:hover:not(.missing) {
    border-color: var(--green);
  }
  a.missing {
    border-color: #684b45;
    cursor: not-allowed;
  }
  code {
    overflow-wrap: anywhere;
    color: #c6ddd0;
    font-size: 12px;
  }
  small {
    color: var(--muted);
    font:
      10px ui-monospace,
      monospace;
  }
  em {
    color: var(--green);
    font-style: normal;
  }
  i {
    color: var(--red);
    font-style: normal;
  }
  span {
    grid-column: 1 / -1;
    color: var(--muted);
    font-size: 12px;
    line-height: 1.5;
  }
</style>
