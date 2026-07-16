<script lang="ts">
  import type { SmartRowProps } from "../catalog-registry";

  let { record, relativeTime }: SmartRowProps = $props();
</script>

<article class="smart-row accent-blue">
  <a
    class="smart-row-link"
    href={record.artifact.href}
    target="_blank"
    rel="noopener noreferrer"
  >
    <span class="type-rail" aria-hidden="true">
      <span class="type-icon">✓</span><b>Plan</b>
    </span>
    <span class="row-body">
      <span class="project-eyebrow">
        <b>{record.project}</b><span>/</span>Plan
      </span>
      <span class="title-line">
        <strong>{record.artifact.manifest.title}</strong>
        <span class="status-badge ready">Ready</span>
      </span>
      <span class="context-line">
        <b>{record.project}</b>
        {#if record.repository}<code>{record.repository}</code>{/if}
        <time datetime={record.artifact.manifest.createdAt}
          >Created {relativeTime(record.artifact.manifest.createdAt)}</time
        >
      </span>
      <span class="metrics-line">
        {#if record.producer}<span>Produced by {record.producer}</span>{/if}
        <span>{record.artifact.manifest.id}</span>
        {#if record.imported}<span class="provenance-badge">Imported</span>{/if}
      </span>
    </span>
  </a>
</article>
