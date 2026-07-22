<script lang="ts">
  import { sourceNumber } from "../catalog";
  import type { SmartRowProps } from "../catalog-registry";
  import { prArtifactStaleness } from "../pr-artifact-staleness";
  import { reviewDecisionBadge } from "../pr-review-decision";

  let {
    record,
    relativeTime,
    prSummary,
    prFreshness = "partial",
    grouped = false,
    contextOnly = false,
    ambiguous = false,
  }: SmartRowProps = $props();

  const pr = $derived(prSummary?.pr);
  const number = $derived(pr?.number ?? sourceNumber(record.source, "pr"));
  const title = $derived(
    pr?.title || record.artifact.manifest.title.replace(/^PR #\d+:\s*/, ""),
  );
  const prState = $derived(
    pr?.isDraft ? "DRAFT" : (pr?.state || record.status || "PR").toUpperCase(),
  );
  const head = $derived(pr?.headRefName || record.branch);
  const base = $derived(pr?.baseRefName || record.baseBranch);
  const stateClass = $derived(prState.toLowerCase());
  const artifactStaleness = $derived(prArtifactStaleness(record, prSummary));
  const approval = $derived(reviewDecisionBadge(pr?.reviewDecision));
  const comments = $derived(pr ? pr.comments + pr.reviewComments : undefined);
  const githubUrl = $derived(pr?.url || record.sourceUrl);
  const hasGithubData = $derived(
    number !== undefined ||
      approval !== undefined ||
      comments !== undefined ||
      Boolean(githubUrl),
  );
  const shortOid = (value: string | undefined) => value?.slice(0, 8);
  const freshnessLabel = $derived(
    ambiguous
      ? "Ambiguous"
      : pr
        ? prFreshness === "live"
          ? "Live"
          : prFreshness === "stale"
            ? "Stale"
            : "Partial"
        : "Snapshot",
  );
</script>

<article
  class:grouped
  class:context-only={contextOnly}
  class:stale-review={artifactStaleness.stale}
  class="smart-row accent-green"
>
  <a
    class="smart-row-link"
    href={record.artifact.href}
    target="_blank"
    rel="noopener noreferrer"
  >
    <span class="type-rail" aria-hidden="true">
      <span class="type-icon">⌘</span><b>PR review</b>
    </span>
    <span class="row-body">
      <span class="project-eyebrow">
        <b>{record.project}</b><span>/</span>PR review
      </span>
      <span class="title-line">
        <strong>{title}</strong>
      </span>
      <span class="branch-line">
        <span class={`status-badge ${stateClass}`}>{prState}</span>
        <span class:stack-flow={grouped} class="branch-flow">
          {#if head}<code title="Change branch">{head}</code>{/if}
          {#if head && base}<span class="branch-arrow" aria-label="merges into"
              >→</span
            >{/if}
          {#if base}<code title="Base branch">{base}</code>{/if}
        </span>
        {#if freshnessLabel !== "Live"}
          <small class={`freshness ${prFreshness}`}>{freshnessLabel}</small>
        {/if}
        {#if contextOnly}<small class="context-label"
            >Included for context</small
          >{/if}
      </span>
      {#if artifactStaleness.stale}
        <span class="stale-review-warning" role="status">
          <span aria-hidden="true">!</span>
          <span>
            <b>Review may be outdated.</b> The PR head changed after this
            artifact was created (<code
              >{shortOid(artifactStaleness.recordedHead)}</code
            >
            →
            <code>{shortOid(artifactStaleness.currentHead)}</code>).
          </span>
        </span>
      {/if}
      <span class="metrics-line">
        {#if pr?.mergedAt}<span><b>Merged</b> {relativeTime(pr.mergedAt)}</span
          >{:else if pr?.author}<span
            ><b>{pr.author.login}</b> updated {relativeTime(pr.updatedAt)}</span
          >{:else}<span
            >Created {relativeTime(record.artifact.manifest.createdAt)}</span
          >{/if}
        {#if pr}
          <span>{pr.changedFiles} files</span>
          <span class="additions">+{pr.additions.toLocaleString()}</span>
          <span class="deletions">−{pr.deletions.toLocaleString()}</span>
        {/if}
      </span>
    </span>
  </a>
  {#if hasGithubData}
    <footer class="github-cluster" aria-label="GitHub pull request data">
      <span class="github-facts">
        {#if number !== undefined}
          <span class="github-pr-number">PR #{number}</span>
        {/if}
        {#if approval}
          <span
            class={`review-decision ${approval.kind}`}
            title="GitHub review decision">{approval.label}</span
          >
        {/if}
        {#if comments !== undefined}
          <span>{comments} {comments === 1 ? "comment" : "comments"}</span>
        {/if}
      </span>
      {#if githubUrl}
        <a
          class="github-action"
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open${number === undefined ? " pull request" : ` PR #${number}`} on GitHub (opens in new tab)`}
          >GitHub <span aria-hidden="true">↗</span></a
        >
      {/if}
    </footer>
  {/if}
</article>
