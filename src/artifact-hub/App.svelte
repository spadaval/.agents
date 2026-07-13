<script lang="ts">
  import { buildCatalogRecords, type ArtifactRecord } from "./catalog";
  import { parseArtifactManifest, type ParsedArtifact } from "./manifest";

  const manifestSources = import.meta.glob("/artifacts/*/manifest.json", {
    eager: true,
    query: "?raw",
    import: "default",
  }) as Record<string, string>;
  const artifacts: ParsedArtifact[] = Object.entries(manifestSources)
    .map(([manifestPath, raw]) => parseArtifactManifest(raw, manifestPath))
    .sort((left, right) => {
      if (left.valid && right.valid) return Date.parse(right.manifest.createdAt) - Date.parse(left.manifest.createdAt);
      if (left.valid !== right.valid) return left.valid ? -1 : 1;
      return left.directoryName.localeCompare(right.directoryName);
    });
  const records = buildCatalogRecords(artifacts);
  const invalid = artifacts.filter((artifact) => !artifact.valid);
  const projects = [...new Set(records.map((record) => record.project))].sort();
  const kinds = [...new Set(records.map((record) => record.artifact.manifest.kind ?? "artifact"))];

  let query = $state("");
  let kind = $state("all");
  let project = $state("all");
  let prOnly = $state(false);
  let migratedOnly = $state(false);
  let selectedId = $state(records[0]?.artifact.manifest.id ?? "");
  let filtersOpen = $state(false);

  const filtered = $derived(
    records.filter((record) =>
      (!query.trim() || record.searchText.includes(query.toLowerCase())) &&
      (kind === "all" || record.artifact.manifest.kind === kind) &&
      (project === "all" || record.project === project) &&
      (!prOnly || Boolean(record.reference?.startsWith("PR #"))) &&
      (!migratedOnly || record.artifact.manifest.tags?.includes("migrated")),
    ),
  );
  const selected = $derived(
    filtered.find((record) => record.artifact.manifest.id === selectedId) ??
      records.find((record) => record.artifact.manifest.id === selectedId) ??
      filtered[0],
  );
  const grouped = $derived(
    [...filtered]
      .sort((left, right) => Date.parse(right.artifact.manifest.createdAt) - Date.parse(left.artifact.manifest.createdAt))
      .reduce((groups, record) => {
        const bucket = relativeDate(record.artifact.manifest.createdAt);
        (groups.get(bucket) ?? groups.set(bucket, []).get(bucket)!).push(record);
        return groups;
      }, new Map<string, ArtifactRecord[]>()),
  );

  function relativeDate(value: string): string {
    const elapsed = Date.now() - Date.parse(value);
    const days = Math.floor(elapsed / 86_400_000);
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 30) return `${days} days ago`;
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value));
  }

  function kindName(value: string): string {
    return { "html-plan": "Plans", "pr-review": "PR reviews", "codex-reflect": "Retrospectives", visualizer: "Visualizers", artifact: "Other" }[value] ?? value;
  }

  function sourceLabel(record: ArtifactRecord): string {
    return record.reference ?? record.branch ?? record.artifact.manifest.id;
  }

  function openArtifact(href: string): void {
    window.open(href, "_blank", "noopener,noreferrer");
  }
</script>

<svelte:head><title>Artifact Hub</title></svelte:head>

<div class="hub-shell">
  <aside class:open={filtersOpen} class="filters" aria-label="Artifact filters">
    <div class="filters-brand">
      <a href="/" aria-label="Artifact Hub home">AH</a>
      <div><span>Local workbench</span><strong>Artifact Hub</strong></div>
    </div>
    <div class="filter-heading"><span>Browse</span><button onclick={() => (filtersOpen = false)}>Close</button></div>
    <label class="project-select">Project
      <select bind:value={project}>
        <option value="all">All projects</option>
        {#each projects as option}<option value={option}>{option}</option>{/each}
      </select>
    </label>
    <section>
      <p class="filter-label">Content type</p>
      <button class:active={kind === "all"} onclick={() => (kind = "all")}><span>All artifacts</span><small>{records.length}</small></button>
      {#each kinds as option}
        <button class:active={kind === option} onclick={() => (kind = option)}><span>{kindName(option)}</span><small>{records.filter((record) => (record.artifact.manifest.kind ?? "artifact") === option).length}</small></button>
      {/each}
    </section>
    <section>
      <p class="filter-label">Source signals</p>
      <label class="check"><input type="checkbox" bind:checked={prOnly} /> <span>Has pull request</span></label>
      <label class="check"><input type="checkbox" bind:checked={migratedOnly} /> <span>Migrated</span></label>
    </section>
    <p class="filter-note">Metadata is read from each artifact’s manifest and evidence; the Hub does not own its page model.</p>
  </aside>

  <main class="catalog">
    <header class="catalog-header">
      <div class="mobile-bar"><button onclick={() => (filtersOpen = !filtersOpen)} aria-expanded={filtersOpen}>Filters</button><span>{filtered.length} shown</span></div>
      <div class="heading"><p>Artifact index</p><h1>Find the work behind the work.</h1></div>
      <label class="search"><span aria-hidden="true">⌕</span><input bind:value={query} type="search" placeholder="Search title, project, branch, PR, tag…" /><kbd>⌘K</kbd></label>
    </header>
    <div class="list-head"><span>{filtered.length} of {records.length} artifacts</span><span class="list-columns">Artifact <i>Type</i><i>Project / source</i><i>Updated</i></span></div>
    {#if filtered.length === 0}
      <section class="empty"><h2>No matching artifacts</h2><p>Clear a filter or search by a repository, branch, pull request, tag, or title.</p></section>
    {:else}
      <div class="artifact-list">
        {#each [...grouped] as [label, items]}
          <section class="date-group"><h2>{label}<span>{items.length}</span></h2>
            {#each items as record (record.artifact.manifest.id)}
              <article class:selected={selected?.artifact.manifest.id === record.artifact.manifest.id} class="artifact-row">
                <button
                  class="row-select"
                  onclick={() => (selectedId = record.artifact.manifest.id)}
                  ondblclick={() => openArtifact(record.artifact.href)}
                  aria-pressed={selected?.artifact.manifest.id === record.artifact.manifest.id}
                  title="Double-click to open in a new tab"
                >
                  <span class={`kind-mark ${record.artifact.manifest.kind ?? "artifact"}`}></span>
                  <span class="row-title"><strong>{record.artifact.manifest.title}</strong><small>{record.artifact.manifest.tags?.filter((tag) => tag !== "migrated").join(" · ") || record.artifact.manifest.id}</small></span>
                  <span class="row-kind">{record.kindLabel}</span>
                  <span class="row-source"><b>{record.project}</b><small>{sourceLabel(record)}</small></span>
                  <time datetime={record.artifact.manifest.createdAt}>{relativeDate(record.artifact.manifest.createdAt)}</time>
                </button>
                <a class="row-open" href={record.artifact.href} target="_blank" rel="noopener noreferrer" aria-label={`Open ${record.artifact.manifest.title}`}>Open ↗</a>
              </article>
            {/each}
          </section>
        {/each}
      </div>
    {/if}
    {#if invalid.length}<section class="invalid-list"><h2>{invalid.length} invalid manifest{invalid.length === 1 ? "" : "s"}</h2>{#each invalid as artifact}<code>{artifact.directoryName}: {artifact.error}</code>{/each}</section>{/if}
  </main>

  <aside class="inspector" aria-label="Selected artifact details">
    {#if selected}
      <div class="inspector-top"><p>{selected.kindLabel}</p><a href={selected.artifact.href} target="_blank" rel="noopener noreferrer">Open artifact <span>↗</span></a></div>
      <h2>{selected.artifact.manifest.title}</h2>
      <p class="inspector-summary">{selected.artifact.manifest.description ?? "A complete, independently authored application in the shared local runtime."}</p>
      <dl>
        <div><dt>Project</dt><dd>{selected.project}</dd></div>
        {#if selected.reference}<div><dt>Reference</dt><dd>{selected.reference}</dd></div>{/if}
        {#if selected.branch}<div><dt>Branch</dt><dd><code>{selected.branch}</code></dd></div>{/if}
        {#if selected.status}<div><dt>Status</dt><dd class="status">{selected.status}</dd></div>{/if}
        <div><dt>Created</dt><dd>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(selected.artifact.manifest.createdAt))}</dd></div>
        <div><dt>Artifact ID</dt><dd><code>{selected.artifact.manifest.id}</code></dd></div>
      </dl>
      {#if selected.sourceUrl}<a class="source-link" href={selected.sourceUrl}>Open source ↗</a>{/if}
      {#if selected.artifact.manifest.tags?.length}<div class="tag-line">{#each selected.artifact.manifest.tags as tag}<span>{tag}</span>{/each}</div>{/if}
    {:else}<p class="inspector-empty">Select an artifact to inspect its project and source context.</p>{/if}
  </aside>
</div>
