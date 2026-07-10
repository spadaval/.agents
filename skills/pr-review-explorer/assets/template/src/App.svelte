<script lang="ts">
  import { onMount } from "svelte";
  import {
    highlights,
    review,
    starredFiles,
    type Layer,
  } from "./report/review";
  import DiffView from "./DiffView.svelte";
  type File = {
    path: string;
    status: string;
    additions: string;
    deletions: string;
    diff: string;
  };
  type Pack = {
    pr: {
      number: number;
      title: string;
      url: string;
      baseRefName: string;
      headRefName: string;
      additions: number;
      deletions: number;
      changedFiles: number;
    };
    files: File[];
  };
  const previewLimit = 8;
  let pack = $state<Pack | null>(null),
    active = $state(""),
    view = $state<"overview" | "layer">("overview"),
    query = $state(""),
    rail = $state(true),
    selectedPath = $state(""),
    showAll = $state(false),
    priorityOnly = $state(false);
  const selected = $derived(
    review.layers.find((layer: Layer) => layer.id === active),
  );
  const layerFiles = $derived(
    selected
      ? (pack?.files ?? []).filter((file) => selected.matches(file.path))
      : [],
  );
  const files = $derived(
    layerFiles.filter((file) =>
      file.path.toLowerCase().includes(query.toLowerCase()),
    ),
  );
  const layerStars = $derived(
    starredFiles.filter((item) => selected?.matches(item.file)),
  );
  const starredPaths = $derived(new Set(layerStars.map((item) => item.file)));
  const starredLayerFiles = $derived(
    files.filter((file) => starredPaths.has(file.path)),
  );
  const normalFiles = $derived(
    files.filter((file) => !starredPaths.has(file.path)),
  );
  const visibleFiles = $derived(
    query || showAll ? normalFiles : normalFiles.slice(0, previewLimit),
  );
  const currentFile = $derived(
    (priorityOnly ? starredLayerFiles : files).find(
      (file) => file.path === selectedPath,
    ) ?? (priorityOnly ? starredLayerFiles[0] : files[0]),
  );
  const layerHighlights = $derived(
    highlights.filter((item) => selected?.matches(item.file)),
  );
  const currentHighlights = $derived(
    currentFile
      ? highlights.filter((item) => item.file === currentFile.path)
      : [],
  );
  const layerStats = (layer: Layer) => {
    const files = (pack?.files ?? []).filter((file) =>
      layer.matches(file.path),
    );
    return {
      files: files.length,
      additions: files.reduce((n, file) => n + Number(file.additions), 0),
      deletions: files.reduce((n, file) => n + Number(file.deletions), 0),
    };
  };
  const showLayer = (id: string) => {
    active = id;
    view = "layer";
    query = "";
    selectedPath = "";
    showAll = false;
  };
  const togglePriorityOnly = () => {
    priorityOnly = !priorityOnly;
    localStorage.setItem("pr-review:priority-only", String(priorityOnly));
    if (priorityOnly && !starredPaths.has(selectedPath)) {
      selectedPath = starredLayerFiles[0]?.path ?? "";
    }
  };
  onMount(() => {
    priorityOnly = localStorage.getItem("pr-review:priority-only") === "true";
    return fetch("/data/pr.json")
      .then((r) => r.json())
      .then((value: Pack) => {
        pack = value;
        active = review.layers[0]?.id ?? "";
      });
  });
</script>

{#if !pack}<main class="loading">Opening PR…</main>{:else}<div
    class:rail-closed={!rail}
    class="shell"
  >
    <aside>
      <button class="collapse" onclick={() => (rail = !rail)}
        >{rail ? "‹" : "›"}</button
      >
      <div class="brand">
        <span>PR REVIEW</span><strong>#{pack.pr.number}</strong>
      </div>
      <nav>
        <button
          class:chosen={view === "overview"}
          onclick={() => (view = "overview")}
          ><small>OVERVIEW</small>PR landing page</button
        >
        <p class="nav-heading">Layers</p>
        {#each review.layers as layer, index}<button
            class:chosen={view === "layer" && selected?.id === layer.id}
            onclick={() => showLayer(layer.id)}
            ><small
              >{String(index + 1).padStart(2, "0")} · {layerStats(layer).files} files</small
            >{layer.title}</button
          >{#if view === "layer" && selected?.id === layer.id}<div
              class="layer-files"
            >
              <label
                >Files <input
                  bind:value={query}
                  placeholder="Filter files"
                /></label
              >{#if layerStars.length}
                <p class="rail-section-title">★ Priority files</p>
                {#each starredLayerFiles as file}
                  {@const star = layerStars.find(
                    (item) => item.file === file.path,
                  )}
                  <button
                    class="starred-file"
                    class:selected-file={currentFile?.path === file.path}
                    onclick={() => (selectedPath = file.path)}
                    ><code>{file.path}</code><small>{star?.title}</small
                    ></button
                  >
                {/each}
              {/if}
              {#if !priorityOnly}
                <p class="rail-section-title">All files</p>
                {#each visibleFiles as file}<button
                    class:selected-file={currentFile?.path === file.path}
                    onclick={() => (selectedPath = file.path)}
                    ><code>{file.path}</code><small
                      ><em>+{file.additions}</em>
                      <i>−{file.deletions}</i></small
                    ></button
                  >{/each}{#if !query && !showAll && normalFiles.length > previewLimit}<button
                    class="show-more"
                    onclick={() => (showAll = true)}
                    >Show {normalFiles.length - previewLimit} more</button
                  >{/if}{#if showAll && normalFiles.length > previewLimit}<button
                    class="show-more"
                    onclick={() => (showAll = false)}>Show less</button
                  >{/if}
              {/if}
            </div>{/if}{/each}
      </nav>
    </aside>
    {#if view === "overview"}<main class="landing-main">
        <header>
          <button class="mobile" onclick={() => (rail = !rail)}>☰</button>
          <p class="eyebrow">{pack.pr.headRefName} → {pack.pr.baseRefName}</p>
          <h1>{pack.pr.title}</h1>
          <div class="metrics">
            <span><b>{pack.pr.changedFiles}</b> files</span><span class="add"
              ><b>+{pack.pr.additions}</b> additions</span
            ><span class="del"><b>−{pack.pr.deletions}</b> deletions</span><a
              href={pack.pr.url}>Open PR</a
            >
          </div>
        </header>
        <section class="landing">
          <p class="lede">
            Move Industrial Automation testbed credentials to OpenBao, add
            managed Jenkins workflows that resolve testbeds before pyATS runs,
            and align the shared CSDL OpenBao path with TLS.
          </p>
          <div class="highlights">
            <article>
              <b>Security boundary</b>
              <p>
                Secret-bearing YAML is resolved into a private temporary file
                instead of being retained in the repository.
              </p>
            </article>
            <article>
              <b>Operational change</b>
              <p>
                Jenkins receives AppRole credentials, resolves the selected
                testbed, and runs a managed IA job.
              </p>
            </article>
            <article>
              <b>Cross-suite impact</b>
              <p>
                CSDL jobs now use the same HTTPS- and CA-aware OpenBao bootstrap
                helper.
              </p>
            </article>
          </div>
          <h2>Review layers</h2>
          <div class="layer-list">
            {#each review.layers as layer, index}{@const stats =
                layerStats(layer)}<button
                class="layer-card"
                onclick={() => showLayer(layer.id)}
                ><strong class="layer-index"
                  >{String(index + 1).padStart(2, "0")}</strong
                ><span>{stats.files} files</span>
                <div>
                  <h3>{layer.title}</h3>
                  <p>{layer.summary}</p>
                </div>
                <small
                  ><em>+{stats.additions}</em> <i>−{stats.deletions}</i></small
                ></button
              >{/each}
          </div>
        </section>
      </main>{:else}<main class="layer-main">
        <div class="top-bar">
          <div>
            <span class="eyebrow">PR #{pack.pr.number}</span>
            <strong>{pack.pr.title}</strong>
            <small>{pack.pr.headRefName} → {pack.pr.baseRefName}</small>
          </div>
          <label class="priority-switch">
            <input
              type="checkbox"
              checked={priorityOnly}
              onchange={togglePriorityOnly}
            />
            <span aria-hidden="true"></span>
            Priority files only
          </label>
        </div>
        <header>
          <button class="mobile" onclick={() => (rail = !rail)}>☰</button>
          <p class="eyebrow">
            LAYER {String(review.layers.indexOf(selected!) + 1).padStart(
              2,
              "0",
            )}
          </p>
          <h1>{selected?.title}</h1>
          <p class="layer-summary">{selected?.summary}</p>
          <div class="metrics">
            <span><b>{layerFiles.length}</b> files</span><span class="add"
              ><b>+{layerStats(selected!).additions}</b> additions</span
            ><span class="del"
              ><b>−{layerStats(selected!).deletions}</b> deletions</span
            >
          </div>
        </header>
        <section class="review-focus">
          <p class="eyebrow">REVIEW FOCUS</p>
          <ul>
            {#each selected?.focus ?? [] as item}<li>{item}</li>{/each}
          </ul>
        </section>
        {#if layerHighlights.length}
          <section class="important-changes">
            <p class="eyebrow">IMPORTANT CHANGES</p>
            {#each layerHighlights as item}
              <button
                class:medium={item.importance === "medium"}
                onclick={() => (selectedPath = item.file)}
              >
                <strong>{item.title}</strong>
                <code>{item.file}:{item.line}</code>
                <span>{item.why}</span>
                <small>Review: {item.reviewQuestion}</small>
              </button>
            {/each}
          </section>
        {/if}
        {#if currentFile}<section class="file-context">
            <p class="eyebrow">SELECTED FILE</p>
            <div>
              <span class="status">{currentFile.status}</span><code
                >{currentFile.path}</code
              ><small
                ><em>+{currentFile.additions}</em>
                <i>−{currentFile.deletions}</i></small
              >
            </div>
          </section>
          <DiffView
            diff={currentFile.diff}
            highlights={currentHighlights}
          />{:else}<p class="empty">
            No file in this layer matches the filter.
          </p>{/if}
      </main>{/if}
  </div>{/if}

<style>
  .layer-files {
    margin: 0 7px 8px;
    padding: 8px;
    background: #121713;
    border: 1px solid #29352c;
    border-radius: 4px;
  }
  .layer-files label {
    display: block;
    padding: 2px 3px 8px;
    color: #99a99c;
    font:
      700 9px ui-monospace,
      monospace;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .layer-files input {
    width: 100%;
    margin-top: 5px;
    padding: 6px;
    color: #dfe7df;
    background: #0c100d;
    border: 1px solid #334037;
    border-radius: 3px;
  }
  .layer-files > button {
    padding: 7px 6px !important;
    font-size: 10px !important;
  }
  .layer-files code {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .layer-files button small {
    margin-top: 3px;
  }
  .layer-files button.selected-file {
    background: #253126 !important;
    box-shadow: inset 2px 0 var(--green) !important;
  }
  .layer-files .show-more {
    margin-top: 4px;
    color: var(--blue) !important;
    text-align: center !important;
    background: #1a231c !important;
  }
  .rail-section-title {
    margin: 10px 3px 4px;
    color: #aab8ac;
    font:
      700 9px ui-monospace,
      monospace;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .layer-files button.starred-file {
    border-left: 2px solid var(--green);
    background: #1a281d;
  }
  .layer-files button.starred-file small {
    color: #b8d4bf;
  }
  .layer-main,
  .landing-main {
    grid-column: 2;
    width: min(1050px, 100%);
    margin: 0 auto;
    padding: 40px 52px 80px;
  }
  .layer-main header,
  .landing-main header {
    position: relative;
    padding-bottom: 25px;
    border-bottom: 1px solid var(--line);
  }
  .top-bar {
    position: sticky;
    top: 0;
    z-index: 4;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin: -40px -52px 24px;
    padding: 14px 52px;
    background: var(--rail);
    border-bottom: 1px solid #29322b;
  }
  .top-bar strong {
    display: block;
    margin-top: 3px;
    color: #f1f5ef;
    font:
      600 17px/1.2 Georgia,
      serif;
  }
  .top-bar small {
    display: block;
    margin-top: 3px;
    color: var(--muted);
    font:
      10px ui-monospace,
      monospace;
  }
  .priority-switch {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    color: #c8d5ca;
    font-size: 12px;
    cursor: pointer;
  }
  .priority-switch input {
    position: absolute;
    inline-size: 1px;
    block-size: 1px;
    opacity: 0;
  }
  .priority-switch span {
    position: relative;
    inline-size: 32px;
    block-size: 18px;
    background: #38423a;
    border-radius: 999px;
    transition: background 120ms ease;
  }
  .priority-switch span::after {
    position: absolute;
    top: 3px;
    left: 3px;
    inline-size: 12px;
    block-size: 12px;
    content: "";
    background: #b7c3b9;
    border-radius: 50%;
    transition: transform 120ms ease;
  }
  .priority-switch input:checked + span {
    background: #2f6d50;
  }
  .priority-switch input:checked + span::after {
    transform: translateX(14px);
    background: #eff8f0;
  }
  .priority-switch input:focus-visible + span {
    outline: 2px solid var(--blue);
    outline-offset: 2px;
  }
  .layer-summary {
    max-width: 760px;
    color: #d2d9d0;
    font:
      18px/1.58 Georgia,
      serif;
  }
  .review-focus,
  .file-context {
    margin-top: 26px;
    padding: 20px;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 5px;
  }
  .review-focus ul {
    margin: 8px 0 0;
    padding-left: 19px;
    color: #d5ded5;
  }
  .review-focus li {
    margin: 7px 0;
  }
  .important-changes {
    display: grid;
    gap: 8px;
    margin-top: 18px;
    padding: 20px;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 5px;
  }
  .important-changes button {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 5px 12px;
    padding: 12px;
    color: #dce8de;
    text-align: left;
    background: #18251c;
    border: 0;
    border-left: 3px solid var(--green);
    border-radius: 3px;
    cursor: pointer;
  }
  .important-changes button.medium {
    background: #172229;
    border-left-color: var(--blue);
  }
  .important-changes button:hover {
    filter: brightness(1.12);
  }
  .important-changes strong {
    color: #f0f6ef;
    font-size: 13px;
  }
  .important-changes code {
    color: var(--blue);
    font-size: 10px;
  }
  .important-changes span,
  .important-changes small {
    grid-column: 1 / -1;
    color: #c4d3c5;
    font-size: 12px;
    line-height: 1.4;
  }
  .important-changes small {
    color: var(--muted);
    font-size: 11px;
  }
  .file-context > div {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) 100px;
    gap: 10px;
    align-items: center;
    margin: 7px 0 0;
  }
  .file-context code {
    overflow: hidden;
    color: #c6ddd0;
    font-size: 13px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .file-context small {
    text-align: right;
    font:
      11px ui-monospace,
      monospace;
  }
  @media (max-width: 760px) {
    .layer-main,
    .landing-main {
      padding: 57px 18px 50px;
    }
    .file-context > div {
      grid-template-columns: 35px minmax(0, 1fr);
    }
    .file-context small {
      grid-column: 2;
      text-align: left;
    }
    .top-bar {
      margin: -57px -18px 24px;
      padding: 12px 18px;
    }
  }
</style>
