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
     export const id = "runtime-boundary";
     export const order = 10;
     export const title = "Runtime boundary";
     export const files = ["src/runtime/client.ts", "src/runtime/server.ts"];
   </script>

   <p>Optional authored context shown before the exact file diffs.</p>
   ```

   Non-empty `id`, non-empty `title`, and non-empty `files` are required.
   `order` is an optional finite number used before the title/id sort fallback.
   Every `files[]` item is an exact changed path, not a glob or predicate.
   IDs and specified orders are unique among layers, and a path may
   intentionally appear in multiple layers. Every live or extracted changed
   file must appear in at least one layer; stale paths, duplicate paths within
   one layer, and empty layers are invalid.

   Free-standing stories are optional and live flat under
   `<artifact>/src/review/stories/*.svelte`. Create them normally only when the
   user explicitly requests a narrative outside the layer sequence. They use
   the same literal non-empty `id` and `title` exports, may export finite
   `order` and `primary = true`, and contain their story as Svelte markup.
   Story IDs and specified orders are unique among stories, and at most one
   story may be primary.

3. Validate and inspect the viewer:

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
   (otherwise the change map), while explicit destinations use
   `/story/<id>`, `/layer/<id>`, `/layer/<id>/diffs/<changed-path>`, `/map`,
   and `/files/<changed-path>`. When a layer is active, show its changed files
   directly beneath the layer story in the persistent navigation rail. Show all
   files for the active layer in that rail; keep inactive layers collapsed and
   let the rail itself provide the only vertical scroll. Do not paginate, add a
   “show more” control, or create a nested scrolling file list. Selecting a file
   replaces the main story pane with that full diff while preserving the layer
   grouping; do not add an intermediate “layer diffs” page or move layer files
   into a generic bottom bucket. Artifact Hub serves the manifest-declared HTML
   entry for direct navigation and refreshes at every logical route.

   Keep evidence navigation local to each excerpt. `DiffExcerpt` already shows
   its file, line range, explanation, and full-diff link; do not synthesize a
   repetitive “featured in this story” index from the same excerpts. Both full
   file diffs and story excerpts must render through `@pierre/diffs`; an
   excerpt utility may select a semantic old/new line range and reconstruct a
   minimal valid patch, but must not implement a separate raw `<pre>` diff
   renderer or bypass Pierre's syntax highlighting.

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
    └── stories/*.svelte            # optional free-standing stories
```

A generated artifact has either live runtime identity or extracted evidence;
the tree shows both alternatives. Treat evidence packs as immutable. The
artifact owns its page set and custom Svelte code, but not a private package,
Vite config, server, PID file, or dependency tree. Report missing Git objects,
GitHub authentication, proxy support, and invalid review paths with the
concrete command, identifier, and reason.
