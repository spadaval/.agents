---
name: pr-review-explorer
description: Create evidence-backed, diff-first Svelte/Vite review apps for GitHub pull requests. Use when Codex needs to make a large PR easier to review, group changes into semantic layers, provide a sidebar/file navigator, or expose complete per-file diffs outside GitHub's flat file viewer.
---

# PR Review Explorer

Use repository and GitHub facts, not a hand-copied diff. Keep immutable
extracted data separate from agent-authored review stories.

## Workflow

1. Bootstrap a live Artifact Hub review from a checked-out pull request:

   ```bash
   node <skill-dir>/scripts/bootstrap-review-app.mjs \
     --repo . --id pr-review
   ```

   `gh pr view` resolves the pull request associated with the current branch.
   Pass `--pr <number>` to override branch inference. The bootstrapper records
   only repository/PR identity and a same-origin Hub proxy endpoint in
   `runtime/source.json`; it does not generate PR-specific review prose or copy
   the diff into the app.

   Live PR metadata and patches must be served through the authenticated Hub
   endpoint recorded as `endpoint` (`/api/pr-review/<encoded-artifact-id>`).
   This is required for private GitHub and GitHub Enterprise, where a direct
   browser request is unauthenticated. The endpoint uses the artifact's
   repository URL and PR number, runs authenticated `gh api --hostname <host>`
   server-side, and returns the viewer's PR evidence payload. Do not put tokens
   in the artifact or make the browser call the GitHub API directly.

   For an offline, immutable evidence pack, use the extraction/create flow:

   ```bash
   node <skill-dir>/scripts/extract-pr.mjs \
     --repo . --pr <number> --output-dir <workspace>
   node <skill-dir>/scripts/create-review-app.mjs <workspace> \
     --id pr-<number>-review --consume
   ```

   Extraction uses `gh` for PR metadata and Git for the exact `base...head`
   patch. It writes `evidence/pr.json` and `markdown/index.md`. Creation copies
   the complete producer template and evidence into Artifact Hub; `--consume`
   removes the temporary extraction workspace only after successful creation.

2. Make each semantic layer a flat Svelte module under
   `<artifact>/src/review/layers/*.svelte`. The canonical layer story is the
   component's optional markup plus literal metadata in its module script:

   ```svelte
   <script module lang="ts">
     import type { LayerMeta } from "../types";

     export const meta = {
       kind: "layer",
       id: "runtime-boundary",
       order: 10,
       title: "Runtime boundary",
       summary: "Explain the boundary the runtime owns.",
       files: ["src/runtime/client.ts", "src/runtime/server.ts"],
     } as const satisfies LayerMeta;
   </script>

   <p>Optional authored context shown before the exact file diffs.</p>
   ```

   Non-empty `id`, non-empty `title`, non-empty one-line `summary`, and
   non-empty `files` are required. `summary` is concise authored context for
   navigation controls; do not derive it by truncating the Svelte story body.
   Do not export `description` from a layer: its Svelte story body is the
   extended layer narrative. `description` remains for global stories only.
   `order` is an optional finite number used before the title/id sort fallback.
   Every `files[]` item is an exact changed path, not a glob or predicate.
   IDs and specified orders are unique among layers, and a path may
   intentionally appear in multiple layers. Every live or extracted changed
   file must appear in at least one layer; stale paths, duplicate paths within
   one layer, and empty layers are invalid.

   Free-standing stories are optional and live flat under
   `<artifact>/src/review/stories/*.svelte`. Create them normally only when the
   user explicitly requests a narrative outside the layer sequence. They use a
   literal `meta` object satisfying `StoryMeta`, with non-empty `id` and
   `title`, may set finite `order` and `primary: true`, and contain their story
   as Svelte markup. The static validator inspects this literal metadata without
   executing the component.
   Story IDs and specified orders are unique among stories, and at most one
   story may be primary. Treat the primary story's metadata as the artifact's
   PR-level introduction, not as an editorial headline. Its `title` should
   directly describe the PR's goal and major changes. Its `description` should
   be a self-contained paragraph summarizing the PR's purpose and consequential
   implementation changes. Avoid slogans, teasers, or meta-commentary about
   how to read the PR. This constrains the entry point's informational role,
   not the narrative body's voice: stories may be candid, critical, or emphatic
   when the evidence warrants it.

   Treat the primary story body as the canonical medium-detail account of the
   complete PR, not only as a longer version of its introductory metadata. It
   must cover every semantic layer in layer order and let a reviewer understand
   how the whole change fits together before opening an individual layer. For
   each layer, summarize its role, its consequential implementation change, and
   how it connects to the PR's wider behavior; then link to the canonical layer
   story or exact evidence for the full treatment. The primary story owns
   cross-layer synthesis: end-to-end flows, contracts between layers,
   sequencing, dependencies, system-wide tradeoffs, and migration or rollout
   consequences.

   Start that account with the concrete problem and the resulting behavior,
   then explain consequential implementation changes, old and new design where
   relevant, measured evidence, tradeoffs, and the PR's place in a broader
   delivery sequence. When the PR is one incremental slice, distinguish what
   this PR delivers from later roadmap work. Keep evidence already obtained
   separate from planned validation or follow-up.

   Write about the software and its behavior. Do not use slogans, teasers,
   magazine-style headings, or reviewer-process meta-commentary such as “make
   this reviewable” or “how to read this PR.” Keep the review shell compact and
   utilitarian; reserve visual emphasis for evidence, risk, state, and measured
   change.

   Before validation, reread the complete primary story and remove directions
   to the reviewer or reader (for example, “open each layer,” “start here,” or
   “review focus”). Navigation must be self-evident in the shell; the primary
   story contains only facts, design reasoning, evidence, tradeoffs, and
   delivery context about the software.

   Do not build that account by mounting, concatenating, or paraphrasing every
   layer story body. A layer story owns the local implementation mechanics,
   invariants, detailed file relationships, caveats, and exact diff evidence
   needed to understand that layer independently. Repeat only the minimum local
   context needed to make the PR-wide narrative coherent. The primary story
   should mention every layer, but it should not enumerate every changed file,
   reproduce every layer excerpt, or become a generated layer index. Use a
   PR-level excerpt only when it supports a claim about the whole change or a
   consequential interaction between layers; keep layer-local evidence in the
   corresponding layer story.

   Use D2 only when a substantial architecture boundary, multi-stage control
   flow, ownership relationship, or dependency graph is clearer visually. Use
   native HTML tables or grids for timings, mappings, comparisons, roadmaps,
   and delivery sequences; omit diagrams when prose or a small table is
   clearer. Authored diagrams explain the change but are not immutable PR
   evidence: repository facts and exact diffs remain authoritative.

   Keep D2 source under `src/assets/diagrams/*.d2`, generated SVG under
   `src/assets/diagrams/generated/`, and render it with the exported
   `DiagramViewer` primitive. Generate with
   `D2_BIN=/path/to/d2-v0.7.1 bash ./scripts/generate-diagrams.sh`; the helper pins
   D2 v0.7.1 and ELK. Use only trusted local D2 sources and local assets—never
   runtime/user-provided D2 or remote icons. Keep diagram styling
   source-controlled. Resolve D2 as local tool state; never copy, commit, or
   bundle the executable into the artifact or skill. Supply an accessible
   description and retain the viewer's expandable modal rather than making the
   inline story diagram dominate the diff-first layout.

   Use the supplied `DiagramViewer` primitive unchanged. Configure it through
   props and CSS variables; do not replace it with a story-local viewer or
   remove its component tests.

   At runtime, the review shell discovers authored layers, stories, and
   findings through the same-origin
   `GET /api/artifacts/<artifact-id>/modules` registry and then dynamically
   imports only the returned allowlisted module URLs. Do not replace this with
   `import.meta.glob`: artifact content is mutable registry data, while Vite's
   glob key set is a compile-time module-graph concern. Natural artifact,
   story, layer, and file deep links continue to load the stable shell before
   the runtime module registry is resolved.

3. Add requested-review mode only when the user explicitly asks for review
   findings. Keep findings in typed TypeScript modules under
   `<artifact>/src/review/findings/*.ts`, separate from Svelte stories. Define
   a discriminated union with direct `kind` values; render those kinds
   directly, rather than encoding them in tags or prose. Give every finding a
   stable ID, title, explanation, severity `1`–`5`, reviewed PR head OID, and
   one or more exact anchors. Treat S1 as highest severity and S5 as lowest.

   ```ts
   import type { ReviewFinding } from "../types";

   export default {
     id: "retry-duplicates-work",
     kind: "bug",
     severity: 2,
     title: "Retry can repeat committed work",
     body: "The retry path runs after a possible commit and can perform the operation twice.",
     reviewedHeadOid: "<PR-head-commit>",
     anchors: [{ path: "src/retry.ts", side: "new", start: 44, end: 52 }],
   } as const satisfies ReviewFinding;
   ```

   Anchor every finding to an exact repository path, diff side, and line or
   line range. Resolve and validate anchors against the reviewed patch; never
   guess a nearby line or silently relocate an anchor. Bind the finding to the
   reviewed PR head OID. If that head is stale, keep the finding visible as
   stale and do not present its inline annotation as current evidence.

   The viewer generates a direct **Review** page from typed findings and shows
   `Zarro boogs found.` when none exist. A richer multi-file review story is an
   optional global Svelte story, not a requirement for a small finding. Keep it
   directly navigable and distinct from layer stories, and preserve a selected
   finding's exact anchor when opening its full diff.

   Annotate full file diffs through `@pierre/diffs` using the exact anchor and
   the finding's direct kind and severity. Do not annotate story excerpts.
   Keep annotation state tied to the current file revision, and show stale-head
   state instead of attaching an annotation to an approximate line. Keep
   finding data immutable evidence plus authored review content; do not infer
   findings from the diff.

   Treat requested-review mode as a review surface, not an automatic code
   review, issue tracker, PR editor, or replacement for the complete diff.
   Do not create findings unless requested, invent unsupported severity or kind
   values, infer anchors, silently repair stale OIDs, or add a second raw diff
   renderer.

4. Validate and inspect the viewer:

   ```bash
   cd <artifact>
   /root/.agents/node_modules/.bin/vite-node scripts/validate-review.ts
   /root/.agents/node_modules/.bin/vitest run \
     --config /root/.agents/vitest.config.ts --root . --passWithNoTests
   /root/.agents/node_modules/.bin/svelte-check --tsconfig ./tsconfig.json
   /root/.agents/bin/artifact-hub open <artifact-id>
   ```

   The validator statically reads module metadata; it does not execute Svelte
   components. For runtime artifacts it obtains the current changed paths with
   authenticated `gh api`, including `--hostname` for enterprise hosts. For
   evidence packs it reads immutable `evidence/pr.json`. Inspect both desktop
   and narrow widths. File views must show actual patches, not summaries in
   place of evidence.

   Review routes are clean Artifact Hub paths, not physical HTML filenames or
   hash fragments. The artifact root renders the primary story when one exists
   (otherwise the first layer). Use `/story/<id>`, `/layer/<id>`,
   `/layer/<id>/diffs/<changed-path>`, and `/files/<changed-path>` for explicit
   destinations; redirect legacy `/map` paths to the root entry point. Artifact
   Hub serves the manifest-declared HTML entry for direct navigation and
   refreshes at every logical route.

   When an authored diagram is present, validate its D2 source and generated
   SVG, then exercise modal open/close, Escape, focus restoration, keyboard
   panning, and narrow-width scrolling. Diagram behavior is supplemental; it
   must not weaken layer coverage, exact anchors, or full-diff access.

   Render a persistent, evidence-backed topbar above the viewer. It should make
   the PR identifiable without opening another panel: project and repository
   path, title and number, state, branch direction, changed-file and line
   counts, comment activity, author, recent update time, and an explicit link
   to the GitHub PR. Extend the runtime normalizer, Hub proxy, and extraction
   script together; never hardcode PR-specific metadata in the artifact.
   When live evidence cannot load, show a recovery state in the artifact—not a
   bare transport error. Identify the PR when known, surface the HTTP status and
   safe proxy detail, explain that the authored artifact remains intact, and
   provide retry and GitHub-PR actions. Treat binary Git patch chunks as valid
   evidence: resolve their paths from the `diff --git` header when `---`/`+++`
   markers are absent.

   The persistent navigation rail is one file navigator, not separate Review
   and Files modes. Begin with the layer-scope picker, containing **All
   changes** and every semantic layer; do not add a redundant Scope or Files-in
   label. Implement this as the
   purpose-built
   `LayerScopeSelect` component, not a native `<select>` or generic dropdown
   framework. Its trigger shows the active scope; options show a title,
   authored summary, file count, and total changed lines. All changes renders
   the complete PR tree; a selected layer renders only its exact changed paths. Both use
   `@pierre/trees` with real repository paths, Git status, and total
   changed-line count (additions plus deletions). The all-changes tree also
   shows layer-membership signals.

   Under Scope, render one **Stories** section of direct links. Review is a
   peer of the primary PR story and any explicitly authored global stories; it
   carries its finding count but is not a separate navigation mode. Never hide
   global stories in a selector. When a layer is selected, append a visually
   separated **Current layer** sub-section inside Stories with its **Read layer
   story** link. Do not render a duplicate **Read PR story** link for All
   changes: the primary PR story is already a global story. The layer link
   remains available while viewing a scoped file.

   The picker controls both the central narrative context and the tree scope:
   choose a layer to open its story and scope the tree; choose All changes to
   return to the primary PR story and full tree.
   Give the tree all remaining fixed sidebar height and let it use its normal
   virtualized scroll. Do not fake natural expansion, estimate a virtual
   viewport, add a second nested file list, paginate, or add a “show more”
   control.

   Selecting a file uses the central pane for its full diff. A selection from a
   scoped layer tree keeps the layer route and grouping; a selection from All
   changes uses the file route. The central pane is for a story, a layer, or
   one file diff; do not create a standalone Change Map main screen, a generic
   all-files diff page, or an embedded diff navigator. Diff excerpts may appear
   inline in a story, but full diffs remain a separate central view.

   Keep evidence navigation local to each excerpt. `DiffExcerpt` already shows
   its file, line range, explanation, and full-diff link; do not synthesize a
   repetitive “featured in this story” index from the same excerpts. Both full
   file diffs and story excerpts must render through `@pierre/diffs`; an
   excerpt utility may select an exact semantic old/new line range and
   reconstruct a minimal valid patch, but must not infer surrounding context,
   replacement rows, or editorial emphasis. The authored range is the entire
   excerpt; use the complete file diff for anything beyond it. Do not implement
   a separate raw `<pre>` diff renderer or bypass Pierre's syntax highlighting.

   Keep application styling in Svelte component `<style>` blocks. A root
   component may use explicit `:global(...)` rules only for document reset and
   shared theme tokens; do not add broad element or layout selectors to a
   global stylesheet.

## Workspace contract

```text
~/.agents/artifacts/<artifact-id>/
├── manifest.json
├── index.html
├── runtime/source.json             # live: repo/PR identity + Hub proxy endpoint
├── evidence/pr.json                # immutable alternative to runtime/source.json
├── markdown/index.md               # immutable evidence-pack brief
├── scripts/validate-review.ts
└── src/review/
    ├── layers/*.svelte             # required canonical layer stories
    ├── stories/*.svelte            # optional free-standing stories
    └── findings/*.ts               # optional typed requested-review findings
```

A generated artifact has either live runtime identity or extracted evidence;
the tree shows both alternatives. Treat evidence packs as immutable. The
artifact owns its page set and custom Svelte code, but not a private package,
Vite config, server, PID file, or dependency tree. Report missing Git objects,
GitHub authentication, proxy support, and invalid review paths with the
concrete command, identifier, and reason.
