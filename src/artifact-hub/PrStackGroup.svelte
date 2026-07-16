<script lang="ts">
  import type { PrCatalogSnapshot } from "./pr-summary-api";
  import type { PrStack } from "./pr-stacks";
  import PrReviewArtifactRow from "./rows/PrReviewArtifactRow.svelte";

  let {
    stack,
    snapshot,
    matchingIds,
    relativeTime,
  }: {
    stack: PrStack;
    snapshot: PrCatalogSnapshot;
    matchingIds: Set<string>;
    relativeTime: (value: string) => string;
  } = $props();
  let collapsed = $state(false);
  const freshnessLabel = $derived(
    stack.freshness === "live"
      ? "PR stack"
      : stack.freshness === "stale"
        ? "Stale stack"
        : "Partial stack",
  );
  const displayRecords = $derived([...stack.records].reverse());
</script>

<section
  class={`pr-stack ${stack.freshness}`}
  aria-label={`${stack.project} PR stack`}
>
  <header class="stack-header">
    <div>
      <p><b>{stack.project}</b><span>/</span>{freshnessLabel}</p>
      <h2>
        <span>{stack.records.length} pull requests · change branch → base</span>
      </h2>
    </div>
    <div class="stack-header-actions">
      <span>{stack.records.length} open</span>
      <button
        onclick={() => (collapsed = !collapsed)}
        aria-expanded={!collapsed}
      >
        {collapsed ? "Expand" : "Collapse"}
      </button>
    </div>
  </header>
  {#if !collapsed}
    <div class="stack-members">
      {#each displayRecords as record, index (record.artifact.manifest.id)}
        <div class="stack-member">
          <span
            class="stack-position"
            aria-label={`Merge order ${stack.records.length - index}`}
            >{stack.records.length - index}</span
          >
          <PrReviewArtifactRow
            {record}
            {relativeTime}
            grouped
            contextOnly={!matchingIds.has(record.artifact.manifest.id)}
            prSummary={snapshot.summaries[record.artifact.manifest.id]}
            prFreshness={snapshot.freshness}
          />
        </div>
      {/each}
    </div>
  {/if}
</section>
