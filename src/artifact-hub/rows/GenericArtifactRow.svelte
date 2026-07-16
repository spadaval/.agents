<script lang="ts">
  import { catalogKind, type SmartRowProps } from "../catalog-registry";

  let { record, relativeTime }: SmartRowProps = $props();
  const definition = $derived(catalogKind(record.kind));
</script>

<article class={`smart-row accent-${definition.accent}`}>
  <a
    class="smart-row-link"
    href={record.artifact.href}
    target="_blank"
    rel="noopener noreferrer"
  >
    <span class="type-rail" aria-hidden="true"
      ><span>◇</span><b>{definition.label}</b></span
    >
    <span class="row-body">
      <span class="project-eyebrow">
        <b>{record.project}</b><span>/</span>{definition.label}
      </span>
      <span class="title-line"
        ><strong>{record.artifact.manifest.title}</strong></span
      >
      <span class="context-line">
        <b>{record.project}</b>
        {#if record.branch}<code>{record.branch}</code>{/if}
        <time datetime={record.artifact.manifest.createdAt}
          >{relativeTime(record.artifact.manifest.createdAt)}</time
        >
      </span>
      {#if record.artifact.manifest.description}
        <span class="summary-line">{record.artifact.manifest.description}</span>
      {/if}
    </span>
  </a>
</article>
