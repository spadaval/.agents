<script lang="ts">
  import { onMount } from "svelte";
  import { buildCatalogRecords, type ArtifactRecord } from "./catalog";
  import { loadArtifactCatalog } from "./catalog-api";
  import { catalogKind, catalogKinds } from "./catalog-registry";
  import type { ParsedArtifact } from "./manifest";
  import PrReviewGroup from "./PrReviewGroup.svelte";
  import PrStackGroup from "./PrStackGroup.svelte";
  import {
    loadPrCatalogSnapshot,
    type PrCatalogSnapshot,
  } from "./pr-summary-api";
  import {
    groupPrRecords,
    mergedPrArtifactIds,
    type PrGroup,
  } from "./pr-groups";
  import { inferPrStacks, type PrStack } from "./pr-stacks";

  type SortOrder = "newest" | "oldest" | "title";
  type CatalogUnit =
    | {
        type: "record";
        key: string;
        record: ArtifactRecord;
        rank: ArtifactRecord;
      }
    | { type: "pr-group"; key: string; group: PrGroup; rank: ArtifactRecord }
    | { type: "stack"; key: string; stack: PrStack; rank: ArtifactRecord };

  let artifacts = $state<ParsedArtifact[]>([]);
  let catalogLoading = $state(true);
  let catalogError = $state("");
  let prSnapshot = $state<PrCatalogSnapshot | null>(null);
  let query = $state("");
  let kind = $state("all");
  let project = $state("all");
  let sort = $state<SortOrder>("newest");
  let showMerged = $state(false);
  let urlReady = $state(false);
  let searchInput = $state<HTMLInputElement>();

  const allRecords = $derived(buildCatalogRecords(artifacts));
  const allPrGroupResolution = $derived(groupPrRecords(allRecords, prSnapshot));
  const mergedIds = $derived(mergedPrArtifactIds(allPrGroupResolution.groups));
  const records = $derived(
    showMerged
      ? allRecords
      : allRecords.filter(
          (record) => !mergedIds.has(record.artifact.manifest.id),
        ),
  );
  const mergedArtifactCount = $derived(mergedIds.size);
  const invalid = $derived(artifacts.filter((artifact) => !artifact.valid));
  const projects = $derived(
    [...new Set(records.map((record) => record.project))].sort(),
  );
  const presentKinds = $derived(
    catalogKinds.filter((definition) =>
      records.some((record) => record.kind === definition.kind),
    ),
  );
  const unknownCount = $derived(
    records.filter(
      (record) =>
        !catalogKinds.some((definition) => definition.kind === record.kind),
    ).length,
  );
  const matchingRecords = $derived(records.filter(recordMatches));
  const matchingIds = $derived(
    new Set(matchingRecords.map((record) => record.artifact.manifest.id)),
  );
  const prGroupResolution = $derived(groupPrRecords(records, prSnapshot));
  const stackResolution = $derived(
    inferPrStacks(prGroupResolution.groups, prSnapshot),
  );
  const matchingPrGroups = $derived(
    prGroupResolution.groups.filter((group) =>
      group.records.some((record) =>
        matchingIds.has(record.artifact.manifest.id),
      ),
    ),
  );
  const matchingReviewCount = $derived(
    matchingRecords.filter((record) => record.kind === "pr-review").length,
  );
  const catalogUnits = $derived.by(() => {
    const units: CatalogUnit[] = [];
    for (const stack of stackResolution.stacks) {
      const matches = stack.groups.flatMap((group) =>
        group.records.filter((record) =>
          matchingIds.has(record.artifact.manifest.id),
        ),
      );
      if (!matches.length) continue;
      const rank = [...matches].sort(compareRecords)[0];
      units.push({ type: "stack", key: stack.id, stack, rank });
    }
    for (const group of matchingPrGroups) {
      if (stackResolution.memberToStack.has(group.id)) continue;
      const matches = group.records.filter((record) =>
        matchingIds.has(record.artifact.manifest.id),
      );
      const rank = [...matches].sort(compareRecords)[0];
      if (group.records.length > 1) {
        units.push({ type: "pr-group", key: group.id, group, rank });
      } else {
        units.push({
          type: "record",
          key: group.records[0].artifact.manifest.id,
          record: group.records[0],
          rank,
        });
      }
    }
    for (const record of matchingRecords) {
      if (record.kind === "pr-review") continue;
      units.push({
        type: "record",
        key: record.artifact.manifest.id,
        record,
        rank: record,
      });
    }
    return units.sort((left, right) => compareRecords(left.rank, right.rank));
  });
  const activeFilterCount = $derived(
    Number(kind !== "all") +
      Number(project !== "all") +
      Number(Boolean(query.trim())),
  );
  const pageTitle = $derived(
    kind !== "all"
      ? catalogKind(kind).pluralLabel
      : project !== "all"
        ? `${project} artifacts`
        : "All artifacts",
  );

  function readUrlState(): void {
    const params = new URLSearchParams(window.location.search);
    query = params.get("q") ?? "";
    kind = params.get("kind") ?? "all";
    project = params.get("project") ?? "all";
    const requestedSort = params.get("sort");
    sort =
      requestedSort === "oldest" || requestedSort === "title"
        ? requestedSort
        : "newest";
    showMerged = params.get("merged") === "show";
  }

  function writeUrlState(): void {
    const url = new URL(window.location.href);
    const set = (key: string, value: string, defaultValue = "all") => {
      if (value && value !== defaultValue) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    };
    set("q", query, "");
    set("kind", kind);
    set("project", project);
    set("sort", sort, "newest");
    set("merged", showMerged ? "show" : "", "");
    history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }

  $effect(() => {
    query;
    kind;
    project;
    sort;
    showMerged;
    if (urlReady) writeUrlState();
  });

  async function refreshCatalog(): Promise<void> {
    catalogLoading = true;
    catalogError = "";
    try {
      const [catalogResult, summaryResult] = await Promise.allSettled([
        loadArtifactCatalog(),
        loadPrCatalogSnapshot(),
      ]);
      if (catalogResult.status === "rejected") throw catalogResult.reason;
      artifacts = catalogResult.value;
      if (summaryResult.status === "fulfilled") {
        prSnapshot = summaryResult.value;
      } else if (prSnapshot) {
        prSnapshot = { ...prSnapshot, freshness: "stale" };
      }
    } catch (error) {
      catalogError = error instanceof Error ? error.message : String(error);
    } finally {
      catalogLoading = false;
    }
  }

  function recordMatches(record: ArtifactRecord): boolean {
    return (
      (!query.trim() ||
        record.searchText.includes(query.trim().toLowerCase())) &&
      (kind === "all" ||
        record.kind === kind ||
        (kind === "other" &&
          !catalogKinds.some(
            (definition) => definition.kind === record.kind,
          ))) &&
      (project === "all" || record.project === project)
    );
  }

  function compareRecords(left: ArtifactRecord, right: ArtifactRecord): number {
    if (sort === "title") {
      return left.artifact.manifest.title.localeCompare(
        right.artifact.manifest.title,
      );
    }
    const delta =
      Date.parse(right.artifact.manifest.createdAt) -
      Date.parse(left.artifact.manifest.createdAt);
    return sort === "oldest" ? -delta : delta;
  }

  function clearFilters(): void {
    query = "";
    kind = "all";
    project = "all";
  }

  function relativeTime(value: string): string {
    const elapsed = Date.now() - Date.parse(value);
    const future = elapsed < 0;
    const absolute = Math.abs(elapsed);
    const minutes = Math.floor(absolute / 60_000);
    const hours = Math.floor(absolute / 3_600_000);
    const days = Math.floor(absolute / 86_400_000);
    let label: string;
    if (minutes < 1) label = "just now";
    else if (hours < 1) label = `${minutes}m`;
    else if (days < 1) label = `${hours}h`;
    else if (days < 30) label = `${days}d`;
    else
      label = new Intl.DateTimeFormat(undefined, {
        dateStyle: "medium",
      }).format(new Date(value));
    return future && days < 30
      ? `in ${label}`
      : days < 30
        ? `${label} ago`
        : label;
  }

  onMount(() => {
    readUrlState();
    urlReady = true;
    void refreshCatalog();
    const handlePopState = () => readUrlState();
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput?.focus();
      }
    };
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("keydown", handleKeydown);
    };
  });
</script>

<svelte:head><title>{pageTitle} · Artifact Hub</title></svelte:head>

{#if catalogLoading}
  <main class="catalog-state"><p>Loading artifact catalog…</p></main>
{:else if catalogError}
  <main class="catalog-state">
    <h1>Artifact catalog unavailable</h1>
    <p>{catalogError}</p>
    <button onclick={() => void refreshCatalog()}>Retry</button>
  </main>
{:else}
  <div class="hub-shell">
    <header class="site-header">
      <a class="brand" href="/" aria-label="Artifact Hub home">
        <span class="brand-mark" aria-hidden="true">A</span>
        <span><strong>Artifact Hub</strong><small>Local workbench</small></span>
      </a>
      <span class="catalog-total">
        {records.length} artifacts
        {#if mergedArtifactCount && !showMerged}
          · {mergedArtifactCount} merged hidden
        {/if}
      </span>
    </header>

    <main class="catalog">
      <section class="catalog-intro">
        <p class="eyebrow">Artifact index</p>
        <h1>{pageTitle}</h1>
        <p>
          Plans, reviews, and retrospectives—organized around the work they
          explain.
        </p>
      </section>

      <section class="catalog-controls" aria-label="Catalog filters">
        <label class="search">
          <svg viewBox="0 0 24 24" aria-hidden="true"
            ><circle cx="11" cy="11" r="7"></circle><path d="m16 16 5 5"
            ></path></svg
          >
          <input
            bind:this={searchInput}
            bind:value={query}
            type="search"
            placeholder="Search artifacts, projects, branches, sessions…"
          />
          <kbd>⌘K</kbd>
        </label>

        <div class="filter-row">
          <div class="kind-filters" aria-label="Artifact type">
            <button
              class:active={kind === "all"}
              onclick={() => (kind = "all")}
            >
              All artifacts <span>{records.length}</span>
            </button>
            {#each presentKinds as definition}
              <button
                class:active={kind === definition.kind}
                onclick={() => (kind = definition.kind)}
              >
                {definition.pluralLabel}
                <span
                  >{records.filter((record) => record.kind === definition.kind)
                    .length}</span
                >
              </button>
            {/each}
            {#if unknownCount}
              <button
                class:active={kind === "other"}
                onclick={() => (kind = "other")}
              >
                Other <span>{unknownCount}</span>
              </button>
            {/if}
          </div>
          <label class="select-control">
            <span>Project</span>
            <select bind:value={project}>
              <option value="all">All projects</option>
              {#each projects as option}<option value={option}>{option}</option
                >{/each}
            </select>
          </label>
        </div>

        <div class="results-toolbar">
          <div class="active-filters">
            {#if project !== "all"}<button onclick={() => (project = "all")}
                >Project: {project} <span>×</span></button
              >{/if}
            {#if kind !== "all"}<button onclick={() => (kind = "all")}
                >Type: {kind === "other" ? "Other" : catalogKind(kind).label}
                <span>×</span></button
              >{/if}
            {#if query.trim()}<button onclick={() => (query = "")}
                >Search: “{query.trim()}” <span>×</span></button
              >{/if}
            {#if activeFilterCount > 1}<button
                class="clear"
                onclick={clearFilters}>Clear all</button
              >{/if}
          </div>
          <div class="result-actions">
            <span
              >{matchingRecords.length}
              {matchingRecords.length === 1 ? "artifact" : "artifacts"}
              {#if matchingReviewCount}
                · {matchingReviewCount}
                {matchingReviewCount === 1 ? "review" : "reviews"} across
                {matchingPrGroups.length}
                {matchingPrGroups.length === 1 ? "PR" : "PRs"}
              {/if}</span
            >
            {#if mergedArtifactCount}
              <button
                class="merged-visibility-toggle"
                aria-pressed={showMerged}
                onclick={() => (showMerged = !showMerged)}
              >
                {showMerged
                  ? "Hide merged"
                  : `Show ${mergedArtifactCount} merged`}
              </button>
            {/if}
            <label class="sort-control"
              >Sort
              <select bind:value={sort}>
                <option value="newest">Created: newest</option>
                <option value="oldest">Created: oldest</option>
                <option value="title">Title: A–Z</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      {#if catalogUnits.length === 0}
        <section class="empty">
          <span aria-hidden="true">⌕</span>
          <h2>No matching artifacts</h2>
          <p>Try another project, type, or search term.</p>
          <button onclick={clearFilters}>Clear filters</button>
        </section>
      {:else}
        <section class="artifact-list" aria-label="Artifacts">
          {#each catalogUnits as unit (unit.key)}
            {#if unit.type === "stack" && prSnapshot}
              <PrStackGroup stack={unit.stack} {matchingIds} {relativeTime} />
            {:else if unit.type === "pr-group"}
              <PrReviewGroup
                group={unit.group}
                {matchingIds}
                {relativeTime}
                ambiguous={stackResolution.ambiguous.has(unit.group.id)}
              />
            {:else if unit.type === "record"}
              {@const record = unit.record}
              {@const Row = catalogKind(record.kind).component}
              <Row
                {record}
                {relativeTime}
                prSummary={prSnapshot?.summaries[record.artifact.manifest.id]}
                prFreshness={prSnapshot?.freshness}
                ambiguous={stackResolution.ambiguous.has(
                  prGroupResolution.recordToGroup.get(
                    record.artifact.manifest.id,
                  ) ?? "",
                )}
              />
            {/if}
          {/each}
        </section>
      {/if}

      {#if invalid.length}
        <section class="invalid-list">
          <h2>
            {invalid.length} invalid manifest{invalid.length === 1 ? "" : "s"}
          </h2>
          {#each invalid as artifact}<code
              >{artifact.directoryName}: {artifact.error}</code
            >{/each}
        </section>
      {/if}
    </main>
  </div>
{/if}
