<script lang="ts">
  import { onMount } from "svelte";
  import DiffView from "./DiffView.svelte";
  import { layers, primaryStory, stories } from "./review/discovery";
  import { provideReviewRuntime } from "./review/context";
  import { loadReviewPack, type ReviewPack } from "./review/load";
  import type { LayerEntry, ReviewFile, StoryEntry } from "./review/types";

  type View = "map" | "story" | "layer" | "layer-diffs" | "files";

  let pack = $state<ReviewPack | null>(null);
  let loadError = $state("");
  let view = $state<View>("map");
  let activeId = $state("");
  let selectedPath = $state("");
  let query = $state("");
  let rail = $state(
    typeof window === "undefined"
      ? true
      : window.matchMedia("(min-width: 761px)").matches,
  );

  const project = $derived(
    pack?.repository?.split("/").filter(Boolean).at(-1) ?? "repository",
  );
  const selectedLayer = $derived(layers.find((layer) => layer.id === activeId));
  const selectedStory = $derived(
    stories.find((story) => story.id === activeId),
  );
  const layerFiles = $derived(
    selectedLayer ? filesForLayer(selectedLayer) : [],
  );
  const browseFiles = $derived(
    view === "layer-diffs" ? layerFiles : (pack?.files ?? []),
  );
  const filteredFiles = $derived(
    browseFiles.filter((file) =>
      file.path.toLowerCase().includes(query.trim().toLowerCase()),
    ),
  );
  const selectedFile = $derived(
    filteredFiles.find((file) => file.path === selectedPath) ??
      filteredFiles[0],
  );

  const artifactBase =
    window.location.pathname.match(/^\/artifacts\/[^/]+/)?.[0] ?? "";
  const encodePath = (value: string) =>
    value.split("/").map(encodeURIComponent).join("/");
  const routeHref = (nextView: View, id = "") =>
    nextView === "layer-diffs"
      ? `${artifactBase}/layer/${encodePath(id)}/diffs`
      : `${artifactBase}/${nextView}${id ? `/${encodePath(id)}` : ""}`;
  const fileHref = (path: string) => routeHref("files", path);
  const layerFileHref = (layerId: string, path: string) =>
    `${routeHref("layer-diffs", layerId)}/${encodePath(path)}`;

  const selectView = (nextView: View, id = "") => {
    view = nextView;
    activeId =
      nextView === "layer" || nextView === "layer-diffs" || nextView === "story"
        ? id
        : "";
    selectedPath = nextView === "files" ? id : "";
    query = "";
    if (window.matchMedia("(max-width: 760px)").matches) rail = false;
  };

  const navigate = (nextView: View, id = "", replace = false) => {
    selectView(nextView, id);
    const href = routeHref(nextView, id);
    if (window.location.pathname !== href)
      history[replace ? "replaceState" : "pushState"]({}, "", href);
  };

  const openFile = (path: string) => navigate("files", path);
  provideReviewRuntime({ files: () => pack?.files ?? [], fileHref, openFile });

  const decodeRoute = () => {
    const relative = window.location.pathname
      .slice(artifactBase.length)
      .replace(/^\/+|\/+$/g, "");
    if (!relative) {
      if (primaryStory) return selectView("story", primaryStory.id);
      return selectView("map");
    }
    const [kind, ...encoded] = relative.split("/");
    const id = encoded.map(decodeURIComponent).join("/");
    if (kind === "story" && stories.some((story) => story.id === id))
      return navigate("story", id, true);
    if (kind === "layer") {
      const [encodedLayerId = "", mode, ...encodedPath] = encoded;
      const layerId = decodeURIComponent(encodedLayerId);
      if (!layers.some((layer) => layer.id === layerId)) return;
      if (mode === "diffs") {
        selectView("layer-diffs", layerId);
        selectedPath = encodedPath.map(decodeURIComponent).join("/");
        return;
      }
      return navigate("layer", layerId, true);
    }
    if (kind === "files") return navigate("files", id, true);
    if (kind === "map") return navigate("map", "", true);
    history.replaceState({}, "", `${artifactBase}/`);
    if (primaryStory) return selectView("story", primaryStory.id);
    selectView("map");
  };

  function filesForLayer(layer: LayerEntry) {
    const paths = new Set(layer.files);
    return (pack?.files ?? []).filter((file) => paths.has(file.path));
  }

  const stats = (files: ReviewFile[]) => ({
    files: files.length,
    additions: files.reduce((sum, file) => sum + Number(file.additions), 0),
    deletions: files.reduce((sum, file) => sum + Number(file.deletions), 0),
  });

  const layerStats = (layer: LayerEntry) => stats(filesForLayer(layer));
  const layersForFile = (path: string) =>
    layers.filter((layer) => layer.files.includes(path));
  const unknownLayerPaths = (layer: LayerEntry) =>
    layer.files.filter(
      (path) => !(pack?.files ?? []).some((file) => file.path === path),
    );

  const chooseFile = (path: string) => {
    selectedPath = path;
    const href =
      view === "layer-diffs" && selectedLayer
        ? layerFileHref(selectedLayer.id, path)
        : fileHref(path);
    if (window.location.pathname !== href) history.pushState({}, "", href);
  };

  const chooseLayerFile = (layerId: string, path: string) => {
    selectView("layer-diffs", layerId);
    selectedPath = path;
    const href = layerFileHref(layerId, path);
    if (window.location.pathname !== href) history.pushState({}, "", href);
  };

  const defaultTitle = (entry: LayerEntry | StoryEntry) => entry.title;

  onMount(() => {
    const onRoute = () => decodeRoute();
    window.addEventListener("popstate", onRoute);
    loadReviewPack()
      .then((value) => {
        pack = value;
        decodeRoute();
      })
      .catch((error: Error) => (loadError = error.message));
    return () => window.removeEventListener("popstate", onRoute);
  });
</script>

{#if loadError}
  <main class="loading">Unable to load PR: {loadError}</main>
{:else if !pack}
  <main class="loading">Opening PR…</main>
{:else}
  <div class:rail-closed={!rail} class="shell">
    <aside>
      <button
        class="collapse"
        aria-label="Toggle navigation"
        onclick={() => (rail = !rail)}>{rail ? "‹" : "›"}</button
      >
      <div class="brand">
        <span>PR REVIEW</span><strong>#{pack.pr.number}</strong>
      </div>
      <nav>
        <a
          class:chosen={view === "map"}
          href={routeHref("map")}
          onclick={(event) => {
            event.preventDefault();
            navigate("map");
          }}
        >
          <small>CHANGE MAP</small>All changed files
        </a>
        {#if stories.length}
          <p class="nav-heading">Stories</p>
          {#each stories as story}
            <a
              class:chosen={view === "story" && activeId === story.id}
              href={routeHref("story", story.id)}
              onclick={(event) => {
                event.preventDefault();
                navigate("story", story.id);
              }}
            >
              <small>{story.primary ? "PRIMARY" : "STORY"}</small>{story.title}
            </a>
          {/each}
        {/if}
        {#if layers.length}
          <p class="nav-heading">Layers</p>
          {#each layers as layer, index}
            <div
              class="layer-nav"
              class:active={(view === "layer" || view === "layer-diffs") &&
                activeId === layer.id}
            >
              <a
                class:chosen={view === "layer" && activeId === layer.id}
                href={routeHref("layer", layer.id)}
                onclick={(event) => {
                  event.preventDefault();
                  navigate("layer", layer.id);
                }}
              >
                <small
                  >{String(index + 1).padStart(2, "0")} · {layerStats(layer)
                    .files} FILES</small
                >
                {layer.title}
              </a>
              {#if (view === "layer" || view === "layer-diffs") && activeId === layer.id}
                {@render layerDiffFiles(layer)}
              {/if}
            </div>
          {/each}
        {/if}
        <p class="nav-heading">Diffs</p>
        <a
          class:chosen={view === "files"}
          href={routeHref("files")}
          onclick={(event) => {
            event.preventDefault();
            navigate("files");
          }}
        >
          <small>{pack.files.length} FILES</small>Browse every diff
        </a>
        {#if view === "files"}{@render diffNavigator()}{/if}
      </nav>
    </aside>

    {#if view === "map"}
      <main class="content landing-main">
        <header>
          <button class="mobile" onclick={() => (rail = !rail)}>☰</button>
          <p class="eyebrow">{project} · PR #{pack.pr.number}</p>
          <p class="branch-line">
            <code>{pack.pr.headRefName}</code><span>→</span><code
              >{pack.pr.baseRefName}</code
            >
          </p>
          <h1>{pack.pr.title}</h1>
          <div class="metrics">
            <span><b>{pack.pr.changedFiles}</b> files</span><span class="add"
              ><b>+{pack.pr.additions}</b> additions</span
            ><span class="del"><b>−{pack.pr.deletions}</b> deletions</span><a
              href={pack.pr.url}>Open PR</a
            >
          </div>
        </header>
        <section class="change-map">
          <div class="section-heading">
            <div>
              <p class="eyebrow">MACHINE-DERIVED</p>
              <h2>Change map</h2>
            </div>
            <span
              >{pack.files.filter((file) => layersForFile(file.path).length)
                .length} of {pack.files.length} files mapped to layers</span
            >
          </div>
          <div class="file-map">
            {#each pack.files as file}
              {@const memberships = layersForFile(file.path)}
              <a
                href={fileHref(file.path)}
                onclick={(event) => {
                  event.preventDefault();
                  openFile(file.path);
                }}
              >
                <span class="status">{file.status}</span><code>{file.path}</code
                >
                <span class="memberships">
                  {#if memberships.length}{#each memberships as layer}<i
                        >{layer.title}</i
                      >{/each}{:else}<i class="unmapped">Unmapped</i>{/if}
                </span>
                <small
                  ><em>+{file.additions}</em> <b>−{file.deletions}</b></small
                >
              </a>
            {/each}
          </div>
        </section>
      </main>
    {:else if view === "story" && selectedStory}
      <main class="content narrative-main">
        <header>
          <button class="mobile" onclick={() => (rail = !rail)}>☰</button>
          <p class="eyebrow">
            STORY{selectedStory.primary ? " · PRIMARY" : ""}
          </p>
          <h1>{defaultTitle(selectedStory)}</h1>
          {#if selectedStory.description}<p class="description">
              {selectedStory.description}
            </p>{/if}
        </header>
        <section class="narrative"><selectedStory.component /></section>
      </main>
    {:else if view === "layer" && selectedLayer}
      <main class="content narrative-main">
        <header>
          <button class="mobile" onclick={() => (rail = !rail)}>☰</button>
          <p class="eyebrow">
            LAYER {String(layers.indexOf(selectedLayer) + 1).padStart(2, "0")}
          </p>
          <h1>{defaultTitle(selectedLayer)}</h1>
          {#if selectedLayer.description}<p class="description">
              {selectedLayer.description}
            </p>{/if}
          <div class="metrics">
            <span><b>{layerFiles.length}</b> files</span><span class="add"
              ><b>+{layerStats(selectedLayer).additions}</b> additions</span
            ><span class="del"
              ><b>−{layerStats(selectedLayer).deletions}</b> deletions</span
            >
          </div>
        </header>
        <section class="narrative"><selectedLayer.component /></section>
        {#if unknownLayerPaths(selectedLayer).length}
          <p class="evidence-warning">
            Layer paths missing from fetched evidence: {unknownLayerPaths(
              selectedLayer,
            ).join(", ")}
          </p>
        {/if}
      </main>
    {:else if view === "layer-diffs" && selectedLayer}
      <main class="content files-main">
        <header>
          <button class="mobile" onclick={() => (rail = !rail)}>☰</button>
          <p class="eyebrow">LAYER DIFFS</p>
          <h1>{selectedLayer.title}</h1>
          <div class="metrics">
            <span><b>{layerFiles.length}</b> files</span>
            <a
              href={routeHref("layer", selectedLayer.id)}
              onclick={(event) => {
                event.preventDefault();
                navigate("layer", selectedLayer.id);
              }}>Read layer story</a
            >
          </div>
        </header>
        <section class="full-diff">{@render selectedDiff()}</section>
      </main>
    {:else}
      <main class="content files-main">
        <header>
          <button class="mobile" onclick={() => (rail = !rail)}>☰</button>
          <p class="eyebrow">ALL FILES</p>
          <h1>Complete pull request patch</h1>
          <div class="metrics">
            <span><b>{pack.files.length}</b> files</span>
          </div>
        </header>
        <section class="full-diff">{@render selectedDiff()}</section>
      </main>
    {/if}
  </div>
{/if}

{#snippet layerDiffFiles(layer: LayerEntry)}
  {@const files = filesForLayer(layer)}
  <div class="layer-file-list">
    {#each files as file}
      <a
        class:chosen={view === "layer-diffs" && selectedPath === file.path}
        href={layerFileHref(layer.id, file.path)}
        onclick={(event) => {
          event.preventDefault();
          chooseLayerFile(layer.id, file.path);
        }}
      >
        <span class="status">{file.status}</span>
        <code>{file.path}</code>
        <small><em>+{file.additions}</em> <i>−{file.deletions}</i></small>
      </a>
    {/each}
  </div>
{/snippet}

{#snippet diffNavigator()}
  <div class="diff-navigator">
    <label>
      Filter diffs
      <input bind:value={query} placeholder="Path contains…" />
    </label>
    {#each filteredFiles as file}
      <a
        class:chosen={selectedFile?.path === file.path}
        href={view === "layer-diffs" && selectedLayer
          ? layerFileHref(selectedLayer.id, file.path)
          : fileHref(file.path)}
        onclick={(event) => {
          event.preventDefault();
          chooseFile(file.path);
        }}
      >
        <span class="status">{file.status}</span>
        <code>{file.path}</code>
        <small><em>+{file.additions}</em> <i>−{file.deletions}</i></small>
      </a>
    {:else}
      <p class="empty">No changed file matches this filter.</p>
    {/each}
  </div>
{/snippet}

{#snippet selectedDiff()}
  {#if selectedFile}
    <div class="file-context">
      <span class="status">{selectedFile.status}</span><code
        >{selectedFile.path}</code
      ><small
        ><em>+{selectedFile.additions}</em>
        <i>−{selectedFile.deletions}</i></small
      >
    </div>
    <DiffView diff={selectedFile.diff} />
  {:else}
    <p class="empty">No file is available in this view.</p>
  {/if}
{/snippet}

<style>
  :global(:root) {
    font-family: Inter, ui-sans-serif, system-ui, sans-serif;
    color: #e6ebe4;
    background: #111512;
    --rail: #0b0e0c;
    --canvas: #111512;
    --paper: #171c18;
    --paper-raised: #1d241f;
    --line: #303a32;
    --blue: #8bb8d6;
    --green: #71d39a;
    --red: #ff9a92;
    --muted: #a4afa5;
  }
  :global(*) {
    box-sizing: border-box;
  }
  :global(body) {
    margin: 0;
    background: var(--canvas);
  }
  button,
  input {
    font: inherit;
  }
  .shell {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    min-height: 100vh;
  }
  .shell.rail-closed {
    grid-template-columns: 42px minmax(0, 1fr);
  }
  .shell > aside {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 5;
    width: 300px;
    overflow: auto;
    color: #e7ece6;
    background: var(--rail);
    border-right: 1px solid #1c231e;
  }
  .rail-closed > aside {
    width: 42px;
    overflow: hidden;
  }
  .collapse {
    position: absolute;
    top: 20px;
    right: 9px;
    color: #dce5dd;
    font-size: 20px;
    background: #1b211d;
    border: 1px solid #39443a;
    border-radius: 3px;
  }
  .brand {
    padding: 22px 18px;
    border-bottom: 1px solid #29322b;
  }
  .brand span,
  .eyebrow {
    display: block;
    color: #8d9d90;
    font:
      700 10px/1.4 ui-monospace,
      monospace;
    letter-spacing: 0.13em;
  }
  .brand strong {
    display: block;
    margin-top: 5px;
    font:
      600 21px Georgia,
      serif;
  }
  nav {
    padding: 12px 9px;
  }
  nav > a {
    display: block;
    width: 100%;
    padding: 10px;
    color: #dce4dc;
    font-size: 13px;
    text-align: left;
    text-decoration: none;
    background: transparent;
    border: 0;
    border-radius: 3px;
  }
  nav > a:hover,
  nav > a.chosen {
    background: #202a22;
    box-shadow: inset 2px 0 var(--green);
  }
  .layer-nav {
    margin: 3px 0 8px;
    border-radius: 3px;
  }
  .layer-nav > a {
    display: block;
    color: #dce4dc;
    text-decoration: none;
  }
  .layer-nav > a:first-child {
    padding: 9px 10px 4px;
    font-size: 13px;
  }
  .layer-nav.active > a:first-child {
    background: #202a22;
    box-shadow: inset 2px 0 var(--green);
  }
  .layer-file-list {
    display: grid;
    gap: 2px;
    margin: 4px 8px 10px 16px;
    padding: 4px 0 4px 5px;
    border-left: 1px solid #29322b;
  }
  nav small,
  .nav-heading {
    display: block;
    color: #90a092;
    font-size: 10px;
  }
  .nav-heading {
    margin: 17px 10px 5px;
    padding-top: 12px;
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    border-top: 1px solid #29322b;
  }
  .diff-navigator {
    display: grid;
    gap: 3px;
    margin: 8px 0 0;
    padding-top: 8px;
    border-top: 1px solid #29322b;
  }
  .diff-navigator label {
    padding: 4px 10px 8px;
    color: var(--muted);
    font:
      700 9px ui-monospace,
      monospace;
    letter-spacing: 0.1em;
    text-transform: uppercase;
  }
  .diff-navigator input {
    width: 100%;
    margin-top: 6px;
    padding: 7px;
    color: #dfe7df;
    background: #0c100d;
    border: 1px solid #334037;
    border-radius: 3px;
  }
  .diff-navigator > a,
  .layer-file-list > a {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr);
    gap: 3px 6px;
    padding: 7px 9px;
    color: inherit;
    text-decoration: none;
    border-radius: 3px;
  }
  .diff-navigator > a:hover,
  .diff-navigator > a.chosen,
  .layer-file-list > a:hover,
  .layer-file-list > a.chosen {
    background: #253126;
    box-shadow: inset 2px 0 var(--green);
  }
  .diff-navigator code,
  .layer-file-list code {
    overflow: hidden;
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .diff-navigator small,
  .layer-file-list small {
    grid-column: 2;
    font:
      9px ui-monospace,
      monospace;
  }
  h1 {
    margin: 7px 0;
    color: #f1f5ef;
    font:
      600 clamp(25px, 3vw, 34px)/1.15 Georgia,
      serif;
  }
  h2 {
    margin: 4px 0 8px;
    color: #eef3ed;
    font:
      600 22px/1.2 Georgia,
      serif;
  }
  .metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 18px;
    margin-top: 18px;
    color: var(--muted);
    font-size: 12px;
  }
  .metrics b {
    color: #ecf2eb;
    font-family: ui-monospace, monospace;
  }
  .metrics .add b,
  em {
    color: var(--green);
  }
  .metrics .del b,
  i {
    color: var(--red);
  }
  em,
  i {
    font-style: normal;
  }
  .metrics a {
    color: var(--blue);
  }
  .status {
    color: var(--blue);
    font:
      700 10px ui-monospace,
      monospace;
  }
  .loading {
    width: min(900px, 100%);
    margin: 0 auto;
    padding: 60px;
    color: var(--muted);
  }
  .mobile {
    display: none;
  }
  .content {
    grid-column: 2;
    width: min(1180px, 100%);
    margin: 0 auto;
    padding: 40px 52px 80px;
  }
  header {
    position: relative;
    padding-bottom: 25px;
    border-bottom: 1px solid var(--line);
  }
  .branch-line {
    display: flex;
    gap: 8px;
    align-items: center;
    margin: 7px 0 0;
    color: var(--muted);
    font-size: 11px;
  }
  .branch-line span {
    color: var(--green);
  }
  .description {
    max-width: 780px;
    color: #d2d9d0;
    font:
      18px/1.58 Georgia,
      serif;
  }
  .change-map,
  .narrative,
  .full-diff {
    padding-top: 28px;
  }
  .narrative:empty {
    display: none;
  }
  .section-heading {
    display: flex;
    justify-content: space-between;
    gap: 20px;
    align-items: end;
    margin-bottom: 14px;
  }
  .section-heading span {
    color: var(--muted);
    font-size: 11px;
  }
  .file-map {
    border-top: 1px solid var(--line);
  }
  .file-map > a {
    display: grid;
    grid-template-columns: 42px minmax(220px, 1fr) minmax(160px, auto) 90px;
    gap: 12px;
    align-items: center;
    padding: 12px 4px;
    color: inherit;
    text-decoration: none;
    border-bottom: 1px solid var(--line);
  }
  .file-map > a:hover {
    background: #161c17;
  }
  .file-map code {
    overflow-wrap: anywhere;
    color: #c6ddd0;
    font-size: 12px;
  }
  .memberships {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
  }
  .memberships i {
    padding: 3px 6px;
    color: #bcd1c1;
    font:
      9px ui-monospace,
      monospace;
    background: #1c2920;
    border-radius: 999px;
  }
  .memberships i.unmapped {
    color: var(--muted);
    background: #242724;
  }
  .file-map small {
    text-align: right;
    font:
      10px ui-monospace,
      monospace;
  }
  .file-map small b {
    color: var(--red);
    font-weight: 400;
  }
  .evidence-warning {
    padding: 12px 14px;
    color: #e3b7af;
    background: #2b1e1b;
    border-left: 3px solid var(--red);
  }
  .file-context {
    display: grid;
    grid-template-columns: 42px minmax(0, 1fr) 100px;
    gap: 10px;
    align-items: center;
    margin-bottom: 10px;
    padding: 14px;
    background: var(--paper);
    border: 1px solid var(--line);
    border-radius: 5px;
  }
  .file-context code {
    overflow: hidden;
    color: #c6ddd0;
    font-size: 12px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .file-context small {
    text-align: right;
    font:
      10px ui-monospace,
      monospace;
  }
  .empty {
    color: var(--muted);
  }
  @media (max-width: 760px) {
    .shell,
    .shell.rail-closed {
      display: block;
    }
    .shell > aside {
      transform: translateX(-100%);
      transition: 0.15s;
    }
    .shell:not(.rail-closed) > aside {
      transform: translateX(0);
    }
    .mobile {
      position: fixed;
      top: 12px;
      left: 12px;
      z-index: 6;
      display: block;
      color: white;
      background: var(--rail);
      border: 1px solid #414841;
      border-radius: 3px;
    }
    .collapse {
      display: none;
    }
  }
  @media (max-width: 820px) {
    .content {
      padding: 57px 18px 50px;
    }
    .file-map > a {
      grid-template-columns: 32px minmax(0, 1fr) 75px;
    }
    .memberships {
      grid-column: 2 / -1;
    }
  }
</style>
