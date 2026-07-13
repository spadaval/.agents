# Share the Artifact Hub runtime, not artifact applications

Artifact Hub uses one Vite/Svelte runtime bound to `0.0.0.0`, one dependency pool, one filesystem catalog, and one systemd user service under `/root/.agents`, while every generated artifact remains a complete custom application under `/root/.agents/artifacts`. A minimal manifest supplies only discovery metadata and an HTML entry. This consolidates process and dependency management without normalizing page models or constraining per-instance Svelte. The host is assumed to be on a trusted internal network; the Hub supplies neither authentication nor TLS.

## Considered options

- A shared typed renderer would deduplicate pages but turn domain output into a constrained schema with migrations and weaker support for custom components.
- A lazy supervisor would improve discovery while preserving multiple Vite processes and dependency trees.
- Static publication would eliminate development servers but introduce a publish and freshness workflow for a local support medium.
- Permanent migration tooling would preserve an obsolete runtime boundary after the one-time manual cutover.

## Consequences

Systemd is the sole process owner, `/root/.agents/artifacts` is the sole generated root, and producer skills retain their specialized templates and validators. All artifacts share current root dependencies and one browser origin; agents repair rare compatibility breaks, use relative URLs, and namespace browser state by artifact ID.
