---
name: generate-html-plan
description: Explore and resolve a substantial product, architecture, or implementation plan, then communicate it as a clear, domain-specific Svelte application in Artifact Hub. Use when an interactive visual plan will be easier to understand than a long chat or Markdown document.
---

# Generate HTML Plan

Produce a plan that a person can understand quickly and use to guide
implementation. Treat the Svelte app as the plan itself while choices are being
explored, not as a viewer for a prescribed document schema. When a plan is
published for Agent Factory execution, its
repository-tracked strategic plan becomes the execution-time authority.

## Plan collaboratively

1. Inspect the relevant repository code, tests, configuration, and local guidance. Do not ask the user for facts the repository can answer.
2. Identify consequential choices and interview the user in small batches until those choices are resolved. Explain meaningful options, tradeoffs, and a recommendation. Record low-impact assumptions explicitly.
3. Keep scope, success, current behavior, system boundaries, failure handling, compatibility, operations, delivery order, and validation in mind. Apply only the parts that matter to this domain.
4. Before generation, briefly summarize resolved choices, assumptions, and deferred work. Outside Plan mode, generate immediately. In Plan mode, wait until editing is enabled and the user explicitly asks to generate.

Do not turn the conversation into a long Markdown implementation plan. The app
is the canonical interactive-planning handoff. Publishing an active strategic
plan for Agent Factory execution is the exception described below; do not
duplicate its issue and epic graph in prose.

## Publish For Agent Factory Execution

When an HTML plan will guide a substantial Agent Factory mission, use
`$agent-factory plan` to condense it into a repository-tracked strategic plan
before execution begins.
Preserve the intended outcome, target system shape, governing product and
engineering tradeoffs, boundaries, valuable partial outcomes, adaptation
guidance, assurance claims, and links to owning product, architecture, or ADR
sources.

Exclude issue decomposition, Worker assignments, commands, branches, and
temporary sequencing. Record the source artifact identity and published
revision, link the strategic plan from the main mission, and treat the
repository plan as canonical during execution. The HTML app remains the
deliberation record and richer explanatory reference.

## Build the plan app

Choose a new descriptive artifact ID and scaffold it:

```bash
node <skill-dir>/scripts/create-plan-app.mjs <artifact-id> --title <title> --repository <repository>
```

Then author a complete Svelte app in the created artifact. Design its information architecture and interactions around the actual problem. The agent is free to use components, TypeScript modules, diagrams, timelines, filters, simulations, or light animation when they improve understanding. Do not force the content into a shared plan schema or generic card layout.

Optimize for the reader:

- Lead with the concrete problem and intended system outcome. Make boundaries, important decisions, implementation path, risks, and validation easy to find; treat these as planning concepts, not mandatory page sections.
- Separate independent workstreams. Give each its own problems, decisions, architecture, roadmap, delivery context, and evidence instead of blending unrelated work.
- Combine a roadmap and change sequence when they communicate the same dependency order. Keep achieved evidence separate from planned work, and highlight measured improvements or meaningful validation results.
- Show relationships visually when that is clearer than prose.
- Use progressive disclosure for supporting detail while keeping the essential plan understandable at a glance.
- Keep the tone informational and pragmatic. Prefer compact navigation, plain interface typography, and concise technical language. Avoid slogans, oversized hero typography, magazine-style composition, editorial prose, and decorative visual storytelling.
- Do not build a hero section. Use a compact title and outcome summary within the application shell; at desktop width, the first viewport should also expose navigation and the beginning of substantive plan content. Keep the main heading at interface scale (roughly 2.5rem or smaller), not poster scale.
- Do not use kicker/eyebrow labels or numbered editorial headings unless they communicate real state, scope, or navigation. A visual label is not useful merely because it makes the page look designed.
- Give every visual encoding an actual meaning. Do not add decorative progress bars, fabricated precision, or rows for target stages that no longer exist.
- Preserve accessibility, responsive behavior, and Artifact Hub's injected root navigation.
- Cite relevant repository paths where they help implementation.

The artifact owns its Svelte files, styles, data, and components. There is no
required plan-specific file format. Do not add a duplicate Markdown
implementation plan; the approved Agent Factory strategic-plan publication is
a transfer of authority, not a second tactical plan.

## Choose and render diagrams

Use D2 for substantial architecture boundaries, multi-stage control flows, ownership relationships, and dependency graphs. Use native HTML tables or grids for exact timings, mappings, comparisons, roadmaps, and delivery sequences. Omit the diagram when prose or a small table is clearer.

When a D2 diagram is justified:

1. Keep authoritative sources under `src/assets/diagrams/*.d2` and generated SVGs under `src/assets/diagrams/generated/`.
2. Use ELK layout and trusted, source-controlled local sources and styling only. Do not accept runtime/user-provided D2, remote icons, or externally fetched diagram content.
3. Generate with the template's pinned helper:

   ```bash
   D2_BIN=/path/to/d2-v0.7.1 bash ./scripts/generate-diagrams.sh
   ```

   Resolve the renderer as local tool state. Never copy, commit, or bundle the
   D2 executable into the artifact or skill.

4. Render the SVG with the supplied `src/lib/DiagramViewer.svelte`. Supply a factual title and accessible description; use its expandable modal instead of enlarging the inline diagram until it disrupts the page. Configure the primitive through its props and CSS variables—do not replace it with a one-off viewer or delete its component tests.
5. When comparing the same architecture or control flow before and after the
   change, use one explicit Current/Target selector so the reader can switch
   the shared view in place. Show removed behavior only in the current view;
   omit it from the target rather than inventing a zero-duration stage. Do not
   render two oversized canvases merely to avoid the selector.

## Documentation

Apply domain-language updates only when the user has authorized repository edits. Read [references/context-format.md](references/context-format.md) before changing `CONTEXT.md` or `CONTEXT-MAP.md`. Offer an ADR only for a consequential, durable tradeoff; read [references/adr-format.md](references/adr-format.md) first.

## Validate and hand off

Run the checks appropriate to the app, including at minimum:

```bash
cd ~/.agents/artifacts/<artifact-id>
/root/.agents/node_modules/.bin/svelte-check --tsconfig ./tsconfig.json
/root/.agents/bin/artifact-hub open <artifact-id>
```

Inspect the live app at desktop and narrow widths. Exercise its navigation and interactions, and confirm the central plan remains legible without opening every detail. Run any artifact-specific tests the app introduces.

When diagrams are present, also run `bash ./scripts/generate-diagrams.sh`, verify the committed SVG matches its source, and exercise modal open/close, Escape, focus restoration, keyboard panning, and narrow-width scrolling.

Return the artifact path, viewer URL, validation results, and any domain documentation changed. Keep the final chat response to a concise handoff.

## Workspace contract

Each generated artifact is a complete Svelte application under `~/.agents/artifacts/<id>/`. Use artifact-relative URLs, scope browser storage by artifact ID, and do not add a package manifest, lockfile, local dependency installation, Vite server, or runtime log. Artifact Hub owns the shared toolchain and service.
