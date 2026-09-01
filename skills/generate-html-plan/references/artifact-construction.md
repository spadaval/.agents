# Artifact Construction

Read this only after the document argument, spatial thesis, and representation
choices are settled. It governs implementation mechanics, not design direction.

## Scaffold and ownership

Choose a descriptive artifact ID and scaffold the app:

```bash
node <skill-dir>/scripts/create-plan-app.mjs <artifact-id> --title <title> --repository <repository>
```

Author a complete Svelte application under
`/artifact-hub/artifacts/<artifact-id>/`. The artifact owns its Svelte files,
styles, data, and components; it has no required plan-specific data format.
Use artifact-relative URLs and scope browser storage by artifact ID. Do not add
a package manifest, lockfile, local dependency installation, Vite server, or
runtime log. Artifact Hub owns the shared toolchain and service.

## Repository documentation

Apply domain-language updates only when the user authorized repository edits.
Read [context-format.md](context-format.md) before changing `CONTEXT.md` or
`CONTEXT-MAP.md`. Offer an ADR only for a consequential durable tradeoff, and
read [adr-format.md](adr-format.md) before writing one.

## Publish for Agent Factory execution

When the artifact will guide a substantial Agent Factory mission, use
`$agent-factory plan` to condense it into a repository-tracked strategic plan
before execution. Preserve the outcome, target system, governing tradeoffs,
boundaries, valuable partial outcomes, adaptation guidance, assurance claims,
and links to owning sources.

Exclude issue decomposition, Worker assignments, commands, branches, and
temporary sequencing. Record the artifact identity and revision, link the plan
from the main mission, and treat the repository plan as execution-time
authority. The HTML artifact remains the deliberation record; do not create a
second tactical Markdown plan.

## Technical validation and handoff

Run at minimum:

```bash
cd /artifact-hub/artifacts/<artifact-id>
/artifact-hub/node_modules/.bin/svelte-check --tsconfig ./tsconfig.json
/artifact-hub/bin/artifact-hub open <artifact-id>
```

Inspect the live app at desktop and narrow widths. Exercise navigation and
interactions, preserve accessibility, confirm essential content remains legible
without opening every detail, and run artifact-specific tests.

Report code and tests, Artifact Hub health, live visual inspection, and
cold-reader comprehension separately. If live inspection fails after one
bounded retry, mark it incomplete and do not claim visual readiness. Return the
artifact path, viewer URL, validation results, and any domain documentation
changed in a concise handoff.
