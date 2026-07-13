<script lang="ts">
  import type { Snippet } from "svelte";
  import { useReviewRuntime } from "../context";
  import { createPatchExcerpt } from "../patch";
  import type { ExcerptSide } from "../types";
  import PierreDiff from "./PierreDiff.svelte";

  let {
    path,
    start,
    end = start,
    side = "new",
    label,
    children,
  }: {
    path: string;
    start: number;
    end?: number;
    side?: ExcerptSide;
    label?: string;
    children?: Snippet;
  } = $props();

  const review = useReviewRuntime();
  const file = $derived(
    review.files().find((candidate) => candidate.path === path),
  );
  const excerpt = $derived(
    file
      ? createPatchExcerpt(file.diff, path, side, start, end)
      : {
          ok: false as const,
          message: `${path} is not present in the fetched change set.`,
        },
  );
</script>

<figure class:error={!excerpt.ok}>
  <figcaption>
    <div>
      <code>{label ?? path}</code>
      <small>{path} · {side} lines {start}–{end}</small>
    </div>
    <a
      href={review.fileHref(path)}
      onclick={(event) => {
        if (!file) return event.preventDefault();
        event.preventDefault();
        review.openFile(path);
      }}>Open full file diff</a
    >
  </figcaption>
  {#if excerpt.ok}
    <PierreDiff diff={excerpt.patch} compact hideFileHeader />
  {:else}
    <p class="range-error">
      <strong>Excerpt unavailable.</strong>
      {excerpt.message}
    </p>
  {/if}
  {#if children}<div class="explanation">{@render children()}</div>{/if}
</figure>

<style>
  figure {
    overflow: hidden;
    margin: 0;
    background: #101411;
    border: 1px solid var(--line);
    border-radius: 5px;
  }
  figure.error {
    border-color: #684b45;
  }
  figcaption {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    align-items: center;
    padding: 11px 13px;
    background: var(--paper);
    border-bottom: 1px solid var(--line);
  }
  figcaption div {
    display: grid;
    gap: 3px;
    min-width: 0;
  }
  figcaption code {
    overflow: hidden;
    color: #c6ddd0;
    font-size: 12px;
    text-overflow: ellipsis;
  }
  figcaption small {
    overflow: hidden;
    color: var(--muted);
    font:
      10px ui-monospace,
      monospace;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  figcaption a {
    flex: 0 0 auto;
    color: var(--blue);
    font-size: 11px;
  }
  .range-error {
    margin: 0;
    padding: 16px;
    color: #e3b7af;
    line-height: 1.5;
  }
  .explanation {
    padding: 14px 16px;
    color: #cbd4cc;
    line-height: 1.6;
    background: #171c18;
    border-top: 1px solid var(--line);
  }
  @media (max-width: 620px) {
    figcaption {
      align-items: flex-start;
      flex-direction: column;
    }
  }
</style>
