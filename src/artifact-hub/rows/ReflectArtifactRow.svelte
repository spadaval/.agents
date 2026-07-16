<script lang="ts">
  import { sourceArray } from "../catalog";
  import type { SmartRowProps } from "../catalog-registry";

  let { record, relativeTime }: SmartRowProps = $props();
  const evidenceCount = $derived(
    sourceArray(record.source, "sourceRollouts").length,
  );
</script>

<article class="smart-row accent-rust">
  <a
    class="smart-row-link"
    href={record.artifact.href}
    target="_blank"
    rel="noopener noreferrer"
  >
    <span class="type-rail" aria-hidden="true">
      <span class="type-icon">↺</span><b>Retrospective</b>
    </span>
    <span class="row-body">
      <span class="project-eyebrow">
        <b>{record.project}</b><span>/</span>Retrospective
      </span>
      <span class="title-line"
        ><strong>{record.artifact.manifest.title}</strong></span
      >
      <span class="context-line">
        <b>{record.project}</b>
        {#if record.branch}<code>{record.branch}</code>{/if}
        <time datetime={record.artifact.manifest.createdAt}
          >Created {relativeTime(record.artifact.manifest.createdAt)}</time
        >
      </span>
      <span class="metrics-line">
        {#if record.reference}<span>{record.reference}</span>{/if}
        {#if evidenceCount}<span
            >{evidenceCount} source {evidenceCount === 1
              ? "session"
              : "sessions"}</span
          >{/if}
        {#if record.producer}<span>{record.producer}</span>{/if}
        {#if record.imported}<span class="provenance-badge">Imported</span>{/if}
      </span>
    </span>
  </a>
</article>
