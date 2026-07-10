<script lang="ts">
  import { FileDiff, parsePatchFiles } from "@pierre/diffs";
  import type { Highlight } from "./report/review";

  let { diff, highlights = [] }: { diff: string; highlights?: Highlight[] } =
    $props();
  let container = $state<HTMLDivElement>();

  $effect(() => {
    if (!container) return;
    const fileDiff = parsePatchFiles(diff)[0]?.files[0];
    if (!fileDiff) return;
    const instance = new FileDiff<Highlight>({
      theme: "pierre-dark",
      diffStyle: "unified",
      renderAnnotation: ({ metadata }) => {
        if (!metadata) return undefined;
        const element = document.createElement("div");
        element.className = `diff-callout ${metadata.importance}`;
        element.innerHTML = `<strong>${metadata.title}</strong><span>${metadata.why}</span><em>Review: ${metadata.reviewQuestion}</em>`;
        return element;
      },
    });
    instance.render({
      fileDiff,
      containerWrapper: container,
      lineAnnotations: highlights.map((item) => ({
        side: item.side,
        lineNumber: item.line,
        metadata: item,
      })),
    });
    return () => instance.cleanUp();
  });
</script>

<div class="diff-view" bind:this={container}></div>

<style>
  :global(.diff-callout) {
    display: grid;
    gap: 4px;
    margin: 8px 12px;
    padding: 9px 11px;
    color: #dce8de;
    background: #18251c;
    border-left: 3px solid #71d39a;
    border-radius: 3px;
    font:
      12px/1.4 Inter,
      system-ui,
      sans-serif;
  }
  :global(.diff-callout.medium) {
    border-left-color: #8bb8d6;
    background: #172229;
  }
  :global(.diff-callout strong) {
    color: #f0f6ef;
  }
  :global(.diff-callout span) {
    color: #c4d3c5;
  }
  :global(.diff-callout em) {
    color: #aebdb0;
    font-size: 11px;
    font-style: normal;
  }
</style>
