# Artifact Hub operations

Artifact Hub runs one Vite development server rooted at `/root/.agents`. A
systemd user unit owns the process. The CLI delegates lifecycle operations to
systemd and logs to the journal; it never maintains PID or log files.

## Install and operate the service

Install dependencies and the user unit once:

```bash
cd /root/.agents
npm install
./bin/artifact-hub service install --now
```

The service binds to `0.0.0.0` and the default URL output uses
`http://<hostname>:5173/`. Choose a different stable port at installation time
with `--port <number>`. Artifact Hub has no authentication or TLS, so expose
the port only on a trusted internal network.

The CLI recognizes three environment overrides. `ARTIFACT_HUB_ROOT` changes
the artifact root for isolated tests (the default remains
`/root/.agents/artifacts`). `ARTIFACT_HUB_PORT` changes the default service port
used by URL output and doctor. `ARTIFACT_HUB_BASE_URL` replaces the URL prefix
printed by create, list, and open—for example when a human interface forwards
the service or clients use a preferred DNS name. These do not change the
service's bind address; install the unit with a matching explicit `--port`.

```bash
./bin/artifact-hub start
./bin/artifact-hub stop
./bin/artifact-hub restart
./bin/artifact-hub status
./bin/artifact-hub logs
./bin/artifact-hub logs --follow
```

`service uninstall --now` stops, disables, and removes the user unit. It does
not remove artifacts or dependencies.

## Diagnose

Run:

```bash
./bin/artifact-hub doctor
```

Doctor checks Node and root dependencies, artifact-root permissions, user-unit
installation, user-manager state, service activity, the service port,
manifests, and linger. Treat `Linger=no` as an operational warning: enable it
explicitly when the Hub must start at boot and survive logout:

```bash
loginctl enable-linger "$(id -un)"
```

Artifact Hub does not silently make this user-wide policy change. A degraded
user manager may reflect unrelated failed units; inspect it with
`systemctl --user --failed` before attributing it to the Hub.

If the configured port is occupied, identify its owner before changing the
stable Hub port. Do not launch another Vite server on a random port.

## Create, inspect, and remove artifacts

The generic starter is the default:

```bash
./bin/artifact-hub create example --title "Example visualizer" --kind visualizer
```

Use a producer-owned complete template with `--from`. `--tag` is repeatable;
`--source-json` accepts one JSON object. Use `--json` when another script needs
the created path, URL, and manifest.

Keep source context small and catalog-facing. When available, pass a repository
path or project name, branch, PR number, status, and source URL; the Hub uses
those optional fields for filtering and type-aware catalog summaries, not to
render an artifact’s content. Status in a manifest is a creation-time snapshot;
live-capable catalog rows may enrich it through a runtime endpoint.

PR-review catalog enrichment is resolved as one cached live snapshot. The Hub
may infer a stack only for open or draft PRs in the same repository when one
PR's exact head ref uniquely matches another PR's exact base ref. It presents
that graph as catalog grouping only; closed, ambiguous, or unresolved reviews
remain standalone and artifact manifests remain unchanged.

```bash
./bin/artifact-hub create review-123 --title "Review #123" \
  --kind pr-review --tag review --from /absolute/prepared-template \
  --source-json '{"repository":"/root/project","pr":123}' --json
```

The source template must not contain symlinks or a private runtime. Creation
fails before publishing when the ID exists, the entry is missing, or the
template violates the contract.

```bash
./bin/artifact-hub list
./bin/artifact-hub list --json
./bin/artifact-hub path <id>
./bin/artifact-hub open <id>
./bin/artifact-hub remove <id> --force
```

`open`, `create`, and `list` expose clean `/artifacts/<id>/` URLs. Artifact Hub
serves the manifest-declared HTML entry for that root and for logical deep
routes that request HTML, while real artifact files continue to be served by
their physical paths. Applications should use History API pathname routing;
they should not expose the entry filename or rely on hash routing.

Removal is manual and destructive. There is no pruning, TTL, registry database,
or importer.

## Shared dependencies and validation

Add a library to `/root/.agents/package.json` and update the root lockfile when
an artifact genuinely needs it. Do not add an artifact-local package manifest.
Run root validation after dependency changes:

```bash
cd /root/.agents
npm test
npm run check
```

Run producer validators and Svelte checks against the artifact-local config
using root executables, for example:

```bash
cd /root/.agents/artifacts/<id>
/root/.agents/node_modules/.bin/svelte-check --tsconfig ./tsconfig.json
/root/.agents/node_modules/.bin/vitest run --config /root/.agents/vitest.config.ts --root .
```

Vite discovers raw manifests through its module graph. It transforms an
artifact application only when that artifact is opened, so malformed custom
Svelte should not make the catalog unavailable. Invalid manifest JSON appears
as an invalid catalog entry and should be repaired in place.
