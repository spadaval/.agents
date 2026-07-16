<script lang="ts">
  import {
    FileDiff,
    parsePatchFiles,
    type DiffLineAnnotation,
  } from "@pierre/diffs";
  import type { FindingAnnotation } from "../../DiffView.svelte";

  let {
    diff,
    compact = false,
    hideFileHeader = false,
    annotations = [],
  }: {
    diff: string;
    compact?: boolean;
    hideFileHeader?: boolean;
    annotations?: DiffLineAnnotation<FindingAnnotation>[];
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
    const instance = new FileDiff<FindingAnnotation>({
      theme: "pierre-dark",
      diffStyle: "unified",
      disableFileHeader: hideFileHeader,
      // An excerpt is a selected slice of the patch, not a complete diff.
      // Keep its original line numbers, but never label omitted changes as
      // "unmodified" context.
      hunkSeparators: compact ? "simple" : "line-info",
      unsafeCSS: `
        [data-code] {
          scrollbar-color: #4d5e4f transparent;
          scrollbar-width: thin;
        }
        [data-code]::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        [data-code]::-webkit-scrollbar-track { background: transparent; }
        [data-code]::-webkit-scrollbar-thumb {
          background: #4d5e4f;
          border-radius: 999px;
        }
        [data-code]::-webkit-scrollbar-thumb:hover { background: #6a806d; }
      `,
      renderAnnotation: (annotation) => {
        const metadata = annotation.metadata;
        if (!metadata) return;

        const card = document.createElement("article");
        card.className = "review-finding-card";
        if (metadata.selected) card.dataset.selected = "";

        const label = document.createElement("p");
        label.className = "review-finding-card__meta";
        label.textContent = `${metadata.finding.kind} · S${metadata.finding.severity} · ${metadata.anchor.side} lines ${metadata.anchor.start}–${metadata.anchor.end}`;

        const title = document.createElement("strong");
        title.className = "review-finding-card__title";
        title.textContent = metadata.finding.title;

        const body = document.createElement("p");
        body.className = "review-finding-card__body";
        body.textContent = metadata.finding.body;

        const link = document.createElement("a");
        link.className = "review-finding-card__link";
        link.href = metadata.reviewHref;
        link.textContent = "Open review finding →";

        card.append(label, title, body, link);
        return card;
      },
    });
    instance.render({
      fileDiff,
      containerWrapper: container,
      lineAnnotations: annotations,
    });
    if (annotations.some((annotation) => annotation.metadata.selected)) {
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          container
            ?.querySelector(".review-finding-card[data-selected]")
            ?.scrollIntoView({ block: "center" }),
        ),
      );
    }
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
    scrollbar-color: #4d5e4f transparent;
    scrollbar-width: thin;
    margin: 0 0 18px;
    background: #121713;
    border: 1px solid var(--line);
    border-radius: 5px;
    box-shadow: inset 0 1px #ffffff08;
  }
  .pierre-diff::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  .pierre-diff::-webkit-scrollbar-track {
    background: transparent;
  }
  .pierre-diff::-webkit-scrollbar-thumb {
    background: #4d5e4f;
    border-radius: 999px;
  }
  .pierre-diff::-webkit-scrollbar-thumb:hover {
    background: #6a806d;
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
  :global(.review-finding-card) {
    margin: 8px;
    padding: 12px 14px;
    color: #dfe8df;
    background: #1d2a20;
    border: 1px solid #47634d;
    border-left: 3px solid var(--green);
    border-radius: 4px;
  }
  :global(.review-finding-card[data-selected]) {
    background: #243127;
    border-color: #7ab987;
    box-shadow: 0 0 0 2px #71d39a33;
  }
  :global(.review-finding-card__meta) {
    margin: 0 0 5px;
    color: #9cb7a1;
    font: 700 10px/1.35 ui-monospace, monospace;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  :global(.review-finding-card__title) {
    display: block;
    color: #f0f6ef;
    font-size: 13px;
  }
  :global(.review-finding-card__body) {
    margin: 6px 0 0;
    color: #ccd8ce;
    font-size: 12px;
    line-height: 1.5;
  }
  :global(.review-finding-card__link) {
    display: inline-block;
    margin-top: 8px;
    color: #9fd5b0;
    font-size: 12px;
    font-weight: 700;
    text-decoration: none;
  }
  :global(.review-finding-card__link:hover) {
    color: #d3f3da;
    text-decoration: underline;
  }
</style>
