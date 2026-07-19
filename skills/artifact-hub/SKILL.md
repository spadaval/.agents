---
name: artifact-hub
description: Create, customize, discover, open, validate, or manage complete local Svelte artifact applications in the shared Artifact Hub. Use when Codex needs a one-off visualizer, when a producer skill needs to scaffold its own specialized app under ~/.agents/artifacts, or when operating or diagnosing the single local Artifact Hub service.
---

# Artifact Hub

Keep each artifact a complete application. Share only the Vite/Svelte toolchain,
dependency pool, catalog, and systemd-owned process.

## Create an artifact

Use the generic starter for an ad hoc visualizer:

```bash
/root/.agents/bin/artifact-hub create <id> --title "<title>" \
  --description "<short catalog summary>" --kind visualizer
```

Edit the returned directory directly. It owns its pages, routes, components,
styles, authored data, and evidence. Do not move application content into the
Hub catalog.

For a producer-owned UI, assemble a complete template directory and pass it to
the same command:

```bash
/root/.agents/bin/artifact-hub create <id> --title "<title>" \
  --kind <kind> --from <template-directory> \
  --source-json '{"repository":"/absolute/source/path"}' --json
```

Keep specialized templates with their producer skills. The Hub owns only its
neutral starter and safe copy mechanics.

## Artifact contract

- Use a lowercase stable ID matching the flat directory basename.
- Use artifact-relative HTML, module, data, and asset URLs.
- Include a real HTML entry, normally `index.html`.
- Treat that entry as an implementation detail. Public artifact URLs end at
  `/artifacts/<id>/`; logical application routes continue beneath that root,
  and the Hub resolves direct navigation back to the manifest-declared entry.
- The Hub injects its shared root-navigation control while serving artifact
  HTML. Do not duplicate that control in artifact source or producer templates.
- Do not include `package.json`, lockfiles, `node_modules`, Vite configuration,
  viewer launchers, PID files, or runtime logs.
- Extend `/root/.agents/tsconfig.json` from an artifact-local `tsconfig.json`
  when a check needs an application-scoped include set.
- Scope `localStorage` and other browser state by artifact ID because every app
  shares one origin.
- Treat `manifest.json` as catalog metadata and a readiness marker, never as a
  normalized application document.
- When known, place source context in `source`: `repository`, `project`,
  `branch`, `pr`, `status`, and `url` let the catalog filter and render smart
  summaries without reading or constraining the application’s content. Treat
  manifest status as a creation-time snapshot; live-capable type adapters may
  enrich it at runtime.
- The Hub derives one review collection for artifacts that resolve to the same
  canonical PR identity: GitHub host, base repository, and PR number. Head SHA
  is revision metadata within that collection, not part of PR identity. Strong
  manifest URL identity may preserve collections when live data is unavailable;
  uncertain identities remain standalone.
- The Hub may group open PR review collections into live stacks when a unique
  same-repository head-ref to base-ref chain exists. Stack topology is derived
  from one atomic live summary snapshot, never declared by or written back to
  artifact manifests. Ambiguous, closed, or unavailable PRs remain outside
  stacks without losing their review collections.
- Run domain validation from the producer skill. Artifact Hub validates only
  ID, path, entry, manifest, service, and dependency invariants.

The CLI creates owner-only content in a temporary sibling, writes the manifest
last, and atomically renames the complete directory into
`/root/.agents/artifacts/<id>`. Never hand-create a second artifact root or
start an artifact-local Vite process.

The Hub catalog discovers manifests through `GET /api/artifacts` at page load.
Keep mutable artifact discovery behind that runtime API; do not use
`import.meta.glob` as a catalog registry because its key set belongs to Vite's
module graph and can become stale when artifacts are atomically added or
removed.

## Manage the Hub

Use the CLI rather than PID files or direct Vite processes:

```bash
/root/.agents/bin/artifact-hub list
/root/.agents/bin/artifact-hub open [<id>]
/root/.agents/bin/artifact-hub doctor
/root/.agents/bin/artifact-hub status
/root/.agents/bin/artifact-hub logs
```

Read [references/operations.md](references/operations.md) before installing the
service, changing dependencies or ports, recovering a failure, or removing an
artifact. The service binds to `0.0.0.0` for direct access from the trusted
internal network. It provides no authentication or TLS; do not expose its port
to an untrusted network.
