<script lang="ts">
  import type { PrStack } from "./pr-stacks";
  import PrReviewGroup from "./PrReviewGroup.svelte";

  let {
    stack,
    matchingIds,
    relativeTime,
  }: {
    stack: PrStack;
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
  const displayGroups = $derived([...stack.groups].reverse());
</script>

<section
  class={`pr-stack ${stack.freshness}`}
  aria-label={`${stack.project} PR stack`}
>
  <header class="stack-header">
    <div>
      <p><b>{stack.project}</b><span>/</span>{freshnessLabel}</p>
      <h2>
        <span>{stack.groups.length} pull requests · change branch → base</span>
      </h2>
    </div>
    <div class="stack-header-actions">
      <span>{stack.groups.length} open</span>
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
      {#each displayGroups as group, index (group.id)}
        <div class="stack-member">
          <span
            class="stack-position"
            aria-label={`Merge order ${stack.groups.length - index}`}
            >{stack.groups.length - index}</span
          >
          <PrReviewGroup {group} {matchingIds} {relativeTime} grouped />
        </div>
      {/each}
    </div>
  {/if}
</section>
