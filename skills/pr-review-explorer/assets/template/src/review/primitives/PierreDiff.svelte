<script lang="ts">
  import { FileDiff, parsePatchFiles } from "@pierre/diffs";

  let {
    diff,
    compact = false,
    hideFileHeader = false,
  }: {
    diff: string;
    compact?: boolean;
    hideFileHeader?: boolean;
  } = $props();

  let container = $state<HTMLDivElement>();
  let renderError = $state("");

  $effect(() => {
    if (!container) return;
    renderError = "";
    const fileDiff = parsePatchFiles(diff)[0]?.files[0];
    if (!fileDiff) {
      renderError = "The fetched response does not contain a renderable patch for this file.";
      return;
    }
    const instance = new FileDiff({
      theme: "pierre-dark",
      diffStyle: "unified",
      disableFileHeader: hideFileHeader,
    });
    instance.render({ fileDiff, containerWrapper: container });
    return () => instance.cleanUp();
  });
</script>

{#if renderError}<p class="diff-error">{renderError}</p>{/if}
<div
  class="pierre-diff"
  class:compact
  class:hidden={Boolean(renderError)}
  bind:this={container}
></div>

<style>
  .pierre-diff {
    overflow: auto;
    margin: 0 0 18px;
    background: #121713;
    border: 1px solid var(--line);
    border-radius: 5px;
    box-shadow: inset 0 1px #ffffff08;
  }
  .pierre-diff.compact {
    margin: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }
  .hidden {
    display: none;
  }
  .diff-error {
    margin: 0;
    padding: 18px;
    color: #e3b7af;
    background: #2b1e1b;
    border: 1px solid #684b45;
    border-radius: 5px;
  }
</style>
