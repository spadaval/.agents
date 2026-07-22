<script lang="ts">
  import { sourceNumber, type ArtifactRecord } from "./catalog";
  import { prArtifactStaleness } from "./pr-artifact-staleness";
  import type { PrGroup } from "./pr-groups";
  import PrReviewArtifactRow from "./rows/PrReviewArtifactRow.svelte";

  let {
    group,
    matchingIds,
    relativeTime,
    grouped = false,
    ambiguous = false,
  }: {
    group: PrGroup;
    matchingIds: Set<string>;
    relativeTime: (value: string) => string;
    grouped?: boolean;
    ambiguous?: boolean;
  } = $props();

  let collapsed = $state(false);
  const pr = $derived(group.summary?.pr);
  const representative = $derived(group.records[0]);
  const number = $derived(
    pr?.number ?? sourceNumber(representative.source, "pr"),
  );
  const title = $derived(
    pr?.title ||
      representative.artifact.manifest.title.replace(/^PR #\d+:\s*/, ""),
  );
  const prState = $derived(
    pr?.isDraft
      ? "DRAFT"
      : (pr?.state || representative.status || "PR").toUpperCase(),
  );
  const head = $derived(pr?.headRefName || representative.branch);
  const base = $derived(pr?.baseRefName || representative.baseBranch);
  const githubUrl = $derived(pr?.url || representative.sourceUrl);
  const freshnessLabel = $derived(
    ambiguous
      ? "Ambiguous stack position"
      : pr
        ? group.freshness === "live"
          ? "Live PR"
          : group.freshness === "stale"
            ? "Stale PR data"
            : "Partial PR data"
        : "Manifest snapshot",
  );

  function revisionLabel(record: ArtifactRecord): string {
    const staleness = prArtifactStaleness(record, group.summary);
    const recorded = staleness.recordedHead?.slice(0, 8);
    if (staleness.stale) return `Earlier head ${recorded}`;
    if (recorded && staleness.currentHead) return `Current head ${recorded}`;
    if (recorded) return `Head ${recorded}`;
    return "Revision unknown";
  }
</script>

{#if group.records.length === 1}
  <PrReviewArtifactRow
    record={group.records[0]}
    {relativeTime}
    {grouped}
    contextOnly={!matchingIds.has(group.records[0].artifact.manifest.id)}
    prSummary={group.summary}
    prFreshness={group.freshness}
    {ambiguous}
  />
{:else}
  <section
    class:grouped
    class="pr-review-group"
    aria-label={`${group.project} PR #${number ?? "unknown"} review collection`}
  >
    <header class="review-group-header">
      <div class="review-group-heading">
        <span class="project-eyebrow"
          ><b>{group.project}</b><span>/</span>Review collection</span
        >
        <h2>{title}</h2>
        <div class="branch-line">
          <span class={`status-badge ${prState.toLowerCase()}`}>{prState}</span>
          <span class:stack-flow={grouped} class="branch-flow">
            {#if head}<code title="Change branch">{head}</code>{/if}
            {#if head && base}<span
                class="branch-arrow"
                aria-label="merges into">→</span
              >{/if}
            {#if base}<code title="Base branch">{base}</code>{/if}
          </span>
          <small class={`freshness ${group.freshness ?? "unavailable"}`}
            >{freshnessLabel}</small
          >
        </div>
      </div>
      <div class="review-group-actions">
        <b>{group.records.length} review artifacts</b>
        <button
          onclick={() => (collapsed = !collapsed)}
          aria-expanded={!collapsed}
        >
          {collapsed ? "Expand" : "Collapse"}
        </button>
      </div>
    </header>

    {#if !collapsed}
      <div class="review-variants">
        {#each group.records as record (record.artifact.manifest.id)}
          {@const staleness = prArtifactStaleness(record, group.summary)}
          <a
            class:context-only={!matchingIds.has(record.artifact.manifest.id)}
            class:stale-review={staleness.stale}
            class="review-variant"
            href={record.artifact.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            <span class="review-variant-copy">
              <strong>{record.artifact.manifest.title}</strong>
              {#if record.artifact.manifest.description}
                <span>{record.artifact.manifest.description}</span>
              {/if}
            </span>
            <span class="review-variant-meta">
              <small class:stale={staleness.stale}
                >{revisionLabel(record)}</small
              >
              {#if !matchingIds.has(record.artifact.manifest.id)}
                <small class="context-label">Included for context</small>
              {/if}
              <time datetime={record.artifact.manifest.createdAt}
                >Created {relativeTime(
                  record.artifact.manifest.createdAt,
                )}</time
              >
              <span aria-hidden="true">↗</span>
            </span>
          </a>
        {/each}
      </div>
    {/if}

    <footer class="review-group-footer">
      <span>
        {#if number !== undefined}<b>PR #{number}</b>{/if}
        {#if pr}<span>{pr.changedFiles} files</span>{/if}
        {#if pr?.mergedAt}<span>Merged {relativeTime(pr.mergedAt)}</span
          >{:else if pr?.updatedAt}<span
            >Updated {relativeTime(pr.updatedAt)}</span
          >{/if}
      </span>
      {#if githubUrl}
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open${number === undefined ? " pull request" : ` PR #${number}`} on GitHub (opens in new tab)`}
          >GitHub <span aria-hidden="true">↗</span></a
        >
      {/if}
    </footer>
  </section>
{/if}
