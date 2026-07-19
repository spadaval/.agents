<script lang="ts">
  import { onMount } from "svelte";
  import DiffView, { type FindingAnnotation } from "./DiffView.svelte";
  import { loadReviewEntries } from "./review/discovery";
  import { provideReviewRuntime } from "./review/context";
  import {
    ReviewLoadError,
    loadReviewPack,
    type ReviewPack,
  } from "./review/load";
  import ChangeTree from "./review/primitives/ChangeTree.svelte";
  import LayerScopeSelect, {
    type LayerScopeOption,
  } from "./review/primitives/LayerScopeSelect.svelte";
  import ReviewTopbar from "./review/primitives/ReviewTopbar.svelte";
  import type {
    LayerEntry,
    FindingEntry,
    ReviewAnchor,
    ReviewFile,
    StoryEntry,
  } from "./review/types";

  type View = "review" | "story" | "layer" | "layer-diffs" | "files";

  let pack = $state<ReviewPack | null>(null);
  let layers = $state<LayerEntry[]>([]);
  let stories = $state<StoryEntry[]>([]);
  let findings = $state<FindingEntry[]>([]);
  let primaryStory = $state<StoryEntry | undefined>();
  let loadError = $state<ReviewLoadError | null>(null);
  let view = $state<View>("story");
  let scopeLayerId = $state<string | null>(null);
  let activeId = $state("");
  let selectedPath = $state("");
  let selectedFindingId = $state<string | null>(null);
  let selectedFindingAnchorKey = $state<string | null>(null);
  let mobileRailOpen = $state(false);

  const selectedLayer = $derived(layers.find((layer) => layer.id === activeId));
  const selectedStory = $derived(
    stories.find((story) => story.id === activeId),
  );
  const layerFiles = $derived(
    selectedLayer ? filesForLayer(selectedLayer) : [],
  );
  const scopeLayer = $derived(
    scopeLayerId ? layers.find((layer) => layer.id === scopeLayerId) : undefined,
  );
  const scopedFiles = $derived(
    scopeLayer ? filesForLayer(scopeLayer) : (pack?.files ?? []),
  );
  const browseFiles = $derived(
    view === "layer-diffs" ? layerFiles : (pack?.files ?? []),
  );
  const selectedFile = $derived(
    browseFiles.find((file) => file.path === selectedPath) ?? browseFiles[0],
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
    selectedFindingId = null;
    selectedFindingAnchorKey = null;
    scopeLayerId =
      nextView === "layer" || nextView === "layer-diffs" ? id : null;
    if (window.matchMedia("(max-width: 760px)").matches) mobileRailOpen = false;
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
      return selectView("layer", layers[0]?.id ?? "");
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
    if (kind === "review") return navigate("review", "", true);
    if (kind === "files") {
      if (!id) return navigate("story", primaryStory?.id ?? "", true);
      selectView("files", id);
      const findingId = new URLSearchParams(window.location.search).get("finding");
      const anchorKey = new URLSearchParams(window.location.search).get("anchor");
      const selectedFinding = findings.find((finding) => finding.id === findingId);
      if (selectedFinding?.anchors.some((anchor) => findingAnchorKey(anchor) === anchorKey)) {
        selectedFindingId = findingId;
        selectedFindingAnchorKey = anchorKey;
      }
      return;
    }
    if (kind === "map") return navigate("story", primaryStory?.id ?? "", true);
    history.replaceState({}, "", `${artifactBase}/`);
    if (primaryStory) return selectView("story", primaryStory.id);
    selectView("layer", layers[0]?.id ?? "");
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
  const scopeOptions = $derived<LayerScopeOption[]>([
    {
      id: "all",
      title: "All changes",
      summary: "Every changed file in this pull request.",
      files: pack?.files.length ?? 0,
      lines:
        stats(pack?.files ?? []).additions + stats(pack?.files ?? []).deletions,
    },
    ...layers.map((layer, index) => {
      const totals = layerStats(layer);
      return {
        id: layer.id,
        title: layer.title,
        summary: layer.summary,
        files: totals.files,
        lines: totals.additions + totals.deletions,
        layerNumber: index + 1,
      };
    }),
  ]);
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

  const chooseScope = (layerId: string) => {
    if (layerId === "all") {
      if (primaryStory) return navigate("story", primaryStory.id);
      return navigate("layer", layers[0]?.id ?? "");
    }
    navigate("layer", layerId);
  };

  const findingCount = (path: string) =>
    findings.filter((finding) =>
      finding.anchors.some((anchor) => anchor.path === path),
    ).length;
  const findingAnchorKey = (anchor: ReviewAnchor) =>
    `${anchor.side}:${anchor.start}:${anchor.end}`;
  const findingHref = (findingId: string, anchor: ReviewAnchor) =>
    `${fileHref(anchor.path)}?finding=${encodeURIComponent(findingId)}&anchor=${encodeURIComponent(findingAnchorKey(anchor))}`;
  const reviewFindingHref = (findingId: string) =>
    `${routeHref("review")}#${encodeURIComponent(findingId)}`;
  const findingIsStale = (finding: (typeof findings)[number]) =>
    Boolean(pack?.pr.headRefOid) && finding.reviewedHeadOid !== pack?.pr.headRefOid;
  const openFinding = (findingId: string, anchor: ReviewAnchor) => {
    selectView("files", anchor.path);
    selectedFindingId = findingId;
    selectedFindingAnchorKey = findingAnchorKey(anchor);
    const href = findingHref(findingId, anchor);
    if (`${window.location.pathname}${window.location.search}` !== href)
      history.pushState({}, "", href);
  };
  const findingAnnotations = (path: string): FindingAnnotation[] =>
    findings.flatMap((finding) =>
      finding.anchors
        .filter((anchor) => anchor.path === path)
        .map((anchor) => ({
          finding,
          anchor,
          reviewHref: reviewFindingHref(finding.id),
          selected:
            finding.id === selectedFindingId &&
            findingAnchorKey(anchor) === selectedFindingAnchorKey,
        })),
    );

  const defaultTitle = (entry: LayerEntry | StoryEntry) => entry.title;

  const load = async () => {
    loadError = null;
    try {
      const [nextPack, entries] = await Promise.all([
        loadReviewPack(),
        loadReviewEntries(),
      ]);
      pack = nextPack;
      layers = entries.layers;
      stories = entries.stories;
      findings = entries.findings;
      primaryStory = entries.primaryStory;
      decodeRoute();
    } catch (error) {
      loadError =
        error instanceof ReviewLoadError
          ? error
          : new ReviewLoadError(
              error instanceof Error ? error.message : String(error),
            );
    }
  };

  onMount(() => {
    const onRoute = () => decodeRoute();
    window.addEventListener("popstate", onRoute);
    void load();
    return () => window.removeEventListener("popstate", onRoute);
  });
</script>

{#if loadError}
  <main class="load-error">
    <section>
      <p class="eyebrow">LIVE EVIDENCE UNAVAILABLE</p>
      <h1>Couldn’t load{loadError.prNumber ? ` PR #${loadError.prNumber}` : " this pull request"}.</h1>
      <p>
        Artifact Hub could not retrieve the current GitHub evidence
        {loadError.status ? ` (HTTP ${loadError.status})` : ""}.
      </p>
      {#if loadError.detail}
        <pre><code>{loadError.detail}</code></pre>
      {/if}
      <p class="recovery">
        The review artifact is still present; only its live PR data failed to
        load. Retry after GitHub's patch data is available, or open the pull
        request directly.
      </p>
      <div class="error-actions">
        <button onclick={() => void load()}>Retry evidence load</button>
        {#if loadError.prUrl}
          <a href={loadError.prUrl} target="_blank" rel="noreferrer">Open GitHub PR ↗</a>
        {/if}
      </div>
    </section>
  </main>
{:else if !pack}
  <main class="loading">Opening PR…</main>
{:else}
  <div class:mobile-rail-open={mobileRailOpen} class="shell">
    <ReviewTopbar repository={pack.repository} pr={pack.pr} />
    <aside>
      <div class="rail-scope">
        <LayerScopeSelect
          options={scopeOptions}
          selectedId={scopeLayer?.id ?? "all"}
          onSelect={chooseScope}
        />
      </div>
      <nav class="rail-stories" aria-label="Stories">
        <p>Stories</p>
        <a
          class:chosen={view === "review"}
          href={routeHref("review")}
          onclick={(event) => {
            event.preventDefault();
            navigate("review");
          }}
        >
          <small>REVIEW</small>
          <span>Review <b>{findings.length}</b></span>
        </a>
        {#if stories.length}
          {#each stories as story}
            <a
              class:chosen={view === "story" && activeId === story.id}
              href={routeHref("story", story.id)}
              onclick={(event) => {
                event.preventDefault();
                navigate("story", story.id);
              }}
            >
              <small>{story.primary ? "PR STORY" : "STORY"}</small>
              <span>{story.title}</span>
            </a>
          {/each}
        {/if}
        {#if scopeLayer}
          <div class="rail-layer-story">
            <p>Current layer</p>
            <a
              class:chosen={view === "layer" && activeId === scopeLayer.id}
              href={routeHref("layer", scopeLayer.id)}
              onclick={(event) => {
                event.preventDefault();
                navigate("layer", scopeLayer.id);
              }}
            >
              <small>READ LAYER STORY</small>
              <span>{scopeLayer.title}</span>
            </a>
          </div>
        {/if}
      </nav>
      <div class="tree-pane">
        <ChangeTree
          files={scopedFiles}
          layerCount={scopeLayer ? () => 0 : (path) => layersForFile(path).length}
          {findingCount}
          onSelect={scopeLayer
            ? (path) => chooseLayerFile(scopeLayer.id, path)
            : openFile}
          variant="rail"
          showLayerCount={!scopeLayer}
        />
      </div>
    </aside>

    {#if view === "review"}
      <main class="content narrative-main">
        <header>
          <button class="mobile" onclick={() => (mobileRailOpen = !mobileRailOpen)}>☰</button>
          <p class="eyebrow">CODE REVIEW</p>
          <h1>Review</h1>
          <p class="description">
            {findings.length
              ? `${findings.length} typed finding${findings.length === 1 ? "" : "s"} anchored to the current pull-request diff.`
              : "Review findings appear here when they are supplied with the artifact."}
          </p>
        </header>
        <section class="review-findings">
          {#if findings.length}
            {#each findings as finding}
              <article class="finding-summary" id={finding.id} class:stale={findingIsStale(finding)}>
                <div class="finding-summary__heading">
                  <p class="finding-summary__meta">
                    {finding.kind} · S{finding.severity}
                  </p>
                  <h2>{finding.title}</h2>
                </div>
                <p>{finding.body}</p>
                {#if findingIsStale(finding)}
                  <p class="finding-stale">Reviewed against an older PR head; inspect the current diff before acting on this finding.</p>
                {/if}
                <div class="finding-summary__anchors">
                  {#each finding.anchors as anchor}
                    <a
                      href={findingHref(finding.id, anchor)}
                      onclick={(event) => {
                        event.preventDefault();
                        openFinding(finding.id, anchor);
                      }}
                    >
                      <code>{anchor.path}</code>
                      <span>{anchor.side} lines {anchor.start}–{anchor.end}</span>
                      <span>Open full diff →</span>
                    </a>
                  {/each}
                </div>
              </article>
            {/each}
          {:else}
            <p class="review-empty">Zarro boogs found.</p>
          {/if}
        </section>
      </main>
    {:else if view === "story" && selectedStory}
      <main class="content narrative-main">
        <header>
          <button class="mobile" onclick={() => (mobileRailOpen = !mobileRailOpen)}>☰</button>
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
          <button class="mobile" onclick={() => (mobileRailOpen = !mobileRailOpen)}>☰</button>
          <p class="eyebrow">
            LAYER {String(layers.indexOf(selectedLayer) + 1).padStart(2, "0")}
          </p>
          <h1>{defaultTitle(selectedLayer)}</h1>
          <p class="description">{selectedLayer.summary}</p>
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
          <button class="mobile" onclick={() => (mobileRailOpen = !mobileRailOpen)}>☰</button>
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
          <button class="mobile" onclick={() => (mobileRailOpen = !mobileRailOpen)}>☰</button>
          <p class="eyebrow">FILE DIFF</p>
          <h1>{selectedFile?.path ?? "File diff"}</h1>
          <div class="metrics">
            {#if selectedFile}<span class="add"
                ><b>+{selectedFile.additions}</b> additions</span
              ><span class="del"><b>−{selectedFile.deletions}</b> deletions</span
              >{/if}
          </div>
        </header>
        <section class="full-diff">{@render selectedDiff()}</section>
      </main>
    {/if}
  </div>
{/if}

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
    <DiffView
      diff={selectedFile.diff}
      annotations={findingAnnotations(selectedFile.path).map((metadata) => ({
        side: metadata.anchor.side === "new" ? "additions" : "deletions",
        lineNumber: metadata.anchor.start,
        metadata,
      }))}
    />
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
    --topbar-height: 64px;
  }
  :global(*) {
    box-sizing: border-box;
  }
  :global(body) {
    margin: 0;
    background: var(--canvas);
  }
  :global(html) {
    scrollbar-color: #4d5e4f var(--canvas);
    scrollbar-width: thin;
  }
  :global(html::-webkit-scrollbar) {
    width: 8px;
    height: 8px;
  }
  :global(html::-webkit-scrollbar-track) {
    background: var(--canvas);
  }
  :global(html::-webkit-scrollbar-thumb) {
    background: #4d5e4f;
    border: 2px solid var(--canvas);
    border-radius: 999px;
  }
  :global(html::-webkit-scrollbar-thumb:hover) {
    background: #6a806d;
  }
  button {
    font: inherit;
  }
  .shell {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    min-height: calc(100vh - var(--topbar-height));
    padding-top: var(--topbar-height);
  }
  .shell > aside {
    position: fixed;
    inset: var(--topbar-height) auto 0 0;
    z-index: 5;
    display: flex;
    flex-direction: column;
    width: 300px;
    overflow: hidden;
    color: #e7ece6;
    background: var(--rail);
    border-right: 1px solid #1c231e;
  }
  .eyebrow {
    display: block;
    color: #8d9d90;
    font:
      700 10px/1.4 ui-monospace,
      monospace;
    letter-spacing: 0.13em;
  }
  .rail-scope,
  .rail-stories {
    display: grid;
    gap: 4px;
    padding: 12px 9px;
    border-bottom: 1px solid #29322b;
  }
  .rail-stories > p,
  .rail-layer-story > p {
    margin: 0;
    color: #90a092;
    font:
      700 9px/1.4 ui-monospace,
      monospace;
    letter-spacing: 0.12em;
    text-transform: uppercase;
  }
  .rail-stories a,
  .rail-layer-story a {
    display: grid;
    gap: 2px;
    padding: 7px 9px;
    color: #dce4dc;
    text-decoration: none;
    border-radius: 3px;
  }
  .rail-stories a:hover,
  .rail-stories a.chosen,
  .rail-layer-story a:hover,
  .rail-layer-story a.chosen {
    background: #202a22;
    box-shadow: inset 2px 0 var(--green);
  }
  .rail-stories small,
  .rail-layer-story small {
    color: #90a092;
    font: 9px ui-monospace, monospace;
  }
  .rail-stories a > span,
  .rail-layer-story > a > span {
    font-size: 12px;
    line-height: 1.25;
  }
  .rail-stories b {
    display: inline-grid;
    min-width: 18px;
    min-height: 18px;
    margin-left: 5px;
    padding: 1px 5px;
    color: #dff0e1;
    font: 700 10px/16px ui-monospace, monospace;
    text-align: center;
    background: #28422e;
    border-radius: 999px;
  }
  .rail-layer-story {
    display: grid;
    gap: 4px;
    margin: 8px -9px -12px;
    padding: 10px 9px 12px;
    border-top: 1px solid #29322b;
  }
  .tree-pane {
    flex: 1 1 0;
    min-height: 0;
    padding: 12px 8px;
  }
  h1 {
    margin: 7px 0;
    color: #f1f5ef;
    font: 650 clamp(24px, 3vw, 32px)/1.2 Inter, ui-sans-serif, system-ui,
      sans-serif;
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
  .load-error {
    display: grid;
    min-height: 100vh;
    padding: 48px 24px;
    place-items: center;
  }
  .load-error section {
    width: min(680px, 100%);
    padding: 28px 30px;
    background: var(--paper);
    border: 1px solid #573d35;
    border-radius: 6px;
    box-shadow: 0 18px 50px #0004;
  }
  .load-error h1 {
    margin: 7px 0 13px;
  }
  .load-error p {
    margin: 0 0 15px;
    color: #c8d0c7;
    line-height: 1.55;
  }
  .load-error pre {
    overflow: auto;
    margin: 16px 0;
    padding: 13px 14px;
    color: #f0c8c0;
    font: 12px/1.5 ui-monospace, monospace;
    white-space: pre-wrap;
    background: #241917;
    border: 1px solid #4a332e;
    border-radius: 4px;
  }
  .load-error .recovery {
    color: var(--muted);
  }
  .error-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .error-actions button,
  .error-actions a {
    padding: 9px 11px;
    color: #e6eee6;
    font: 600 12px Inter, ui-sans-serif, system-ui, sans-serif;
    text-decoration: none;
    cursor: pointer;
    background: #203024;
    border: 1px solid #4c6b52;
    border-radius: 4px;
  }
  .error-actions a {
    color: var(--blue);
    background: transparent;
    border-color: #405044;
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
  .description {
    max-width: 780px;
    color: #d2d9d0;
    font: 16px/1.6 Inter, ui-sans-serif, system-ui, sans-serif;
  }
  .narrative,
  .full-diff {
    padding-top: 28px;
  }
  .narrative:empty {
    display: none;
  }
  .review-findings {
    display: grid;
    gap: 14px;
    padding-top: 28px;
  }
  .finding-summary {
    padding: 18px 20px;
    background: var(--paper);
    border: 1px solid var(--line);
    border-left: 3px solid var(--green);
    border-radius: 5px;
  }
  .finding-summary.stale {
    border-left-color: #e5b76a;
  }
  .finding-summary__heading {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 18px;
    align-items: baseline;
  }
  .finding-summary__meta {
    margin: 0;
    color: #9bc1a2;
    font: 700 10px/1.4 ui-monospace, monospace;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .finding-summary h2 {
    margin: 0;
    color: #eff5ee;
    font: 650 19px/1.3 Inter, ui-sans-serif, system-ui, sans-serif;
  }
  .finding-summary > p {
    margin: 11px 0 0;
    color: #ced7ce;
    line-height: 1.55;
  }
  .finding-summary > .finding-stale {
    color: #ead09d;
    font-size: 13px;
  }
  .finding-summary__anchors {
    display: grid;
    gap: 7px;
    margin-top: 15px;
  }
  .finding-summary__anchors a {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto auto;
    gap: 10px;
    align-items: center;
    padding: 9px 10px;
    color: var(--blue);
    text-decoration: none;
    background: #121713;
    border: 1px solid #364239;
    border-radius: 3px;
  }
  .finding-summary__anchors a:hover {
    background: #182219;
    border-color: #547259;
  }
  .finding-summary__anchors code {
    overflow: hidden;
    color: #c9dbcb;
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .finding-summary__anchors span {
    color: var(--muted);
    font: 10px ui-monospace, monospace;
    white-space: nowrap;
  }
  .finding-summary__anchors span:last-child {
    color: var(--blue);
  }
  .review-empty {
    margin: 0;
    padding: 28px;
    color: #c7d4c8;
    font: 600 18px/1.4 Inter, ui-sans-serif, system-ui, sans-serif;
    text-align: center;
    background: var(--paper);
    border: 1px dashed #465349;
    border-radius: 5px;
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
    :global(:root) { --topbar-height: 60px; }
    .shell {
      display: block;
    }
    .shell > aside {
      transform: translateX(-100%);
      transition: 0.15s;
    }
    .shell.mobile-rail-open > aside {
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
  }
  @media (max-width: 820px) {
    .content {
      padding: 57px 18px 50px;
    }
  }
</style>
