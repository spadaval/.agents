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

## Design values

This is a **Read** surface: its job is to make a technical argument
understandable. When concerns conflict, preserve this order:

1. product and repository truth;
2. comprehension of the plan's argument;
3. a clear reading path with low reader effort;
4. complete decisions, boundaries, and implementation guidance;
5. accessible, responsive behavior;
6. visual character;
7. polish.

Preserve necessary domain complexity and structure it so readers can learn it.
Eliminate interface complexity that makes them decode navigation, decoration,
terminology, or visual grammar before they can decode the plan. Start with the
plainest complete explanation. Add a table, diagram, interaction, color, or
container only when it makes a named relationship materially easier to
understand. Technical validity is necessary, but it is not evidence that the
plan communicates well.

## Plan collaboratively

1. Inspect the relevant repository code, tests, configuration, and local guidance.
   Do not ask the user for facts the repository can answer.
2. Resolve consequential choices in small batches. When the request could change
   architectural meaning, or the user asks to rethink, discuss, or return to
   first principles, do not edit until those choices are resolved.
3. Before substantially revising an existing section, record a private section
   contract: intended reader, its one job, adjacent-section ownership,
   must-preserve claims and required fidelity, and non-goals. Skip this for an
   isolated copy, styling, or rendering fix.
4. Briefly summarize resolved choices, assumptions, and deferred work. Then
   generate immediately outside Plan mode. In Plan mode, wait until editing is
   enabled and the user explicitly asks to generate.

Do not turn the conversation into a long Markdown implementation plan. The app
is the canonical interactive-planning handoff while choices are being explored.

## Establish the document argument

Do this before scaffolding or designing components:

1. Classify the plan by its primary purpose: strategic architecture,
   implementation, migration, operations, or another clearly named form. Do
   not let an architecture plan drift into a migration guide, dashboard, or
   operator manual because those layouts are convenient.
2. When a canonical strategy, specification, or prior plan exists, map its
   consequential claims to visible destinations. Preserve its conceptual order
   by default; reorder only when the new sequence improves the argument.
3. Mark each claim as primary visible explanation, supplemental visual, or
   supporting detail. Essential meaning must remain understandable without
   clicking, hovering, opening a disclosure, or interpreting a diagram.
4. Use established domain vocabulary or plain descriptive language. Do not
   invent labels, metaphors, or branded section names merely to make the page
   feel designed.

For a strategic architecture plan, read
[references/strategic-architecture-plan-review.md](references/strategic-architecture-plan-review.md)
and complete its content gate before implementation. Keep the coverage map as
authoring scratch; do not render it in the finished app.

## Design the communication

Begin with semantic content and add components or interactions only where the
reading path requires them. Do not force the content into a shared schema or
generic layout.

Before writing components, state a private spatial thesis: the primary reading
path, what leads and supports, which material belongs together, intended
density, and how the structure adapts at narrow widths. Choose the simplest
structural model that expresses those relationships.

Optimize for the reader:

- Lead with the concrete problem and intended system outcome. Make boundaries, important decisions, implementation path, risks, and validation easy to find; treat these as planning concepts, not mandatory page sections.
- Separate independent workstreams without turning every concern into an equal
  section, tab, or card. Let importance and dependency determine hierarchy.
- Combine a roadmap and change sequence when they communicate the same dependency order. Keep achieved evidence separate from planned work, and highlight measured improvements or meaningful validation results.
- Use progressive disclosure only for supporting detail and examples. Keep
  decisions, ownership, lifecycle, state, and terminal behavior visible when
  they are essential to the plan.
- For abstract APIs, records, or agent workflows, thread one representative
  exchange through the relevant sections instead of presenting detached
  schemas without lifecycle context.
- Use compact application framing, interface typography, and concise technical
  language. The first desktop viewport should expose the title, outcome,
  navigation, and substantive content—not a hero or editorial composition.
- Explain the domain, not the page. Preserve accessibility, responsive behavior,
  Artifact Hub's root navigation, and useful repository citations.

Refuse extraneous design:

- Do not use a card grid as the default document structure, nest cards, or add
  containers where proximity and headings already express the grouping.
- Do not use decorative section numbers, eyebrow labels, technical-costume
  monospace, gradients, glows, ornamental borders, or color without a stable
  semantic role.
- Do not give every region equal visual weight. Establish one primary focus,
  two or three secondary groups, and let supporting material recede.
- Do not add navigation, interaction, motion, a diagram, or another visual
  representation merely to make the artifact feel designed. Essential content
  must not require a decoder or be hidden behind interaction.
- Before polish, remove repeated explanations, flatten unnecessary nesting,
  reduce competing colors and type roles, and prefer a linear reading flow when
  it communicates the same argument.

## Implement the resolved design

After the document argument, spatial thesis, and representation choices are
settled, read
[references/artifact-construction.md](references/artifact-construction.md)
before editing the app. It owns scaffolding, Artifact Hub constraints,
repository documentation, publication, technical checks, and handoff.

When a node-edge diagram is justified because prose or a small table cannot
express the relationship as clearly, also read
[references/diagram-authoring.md](references/diagram-authoring.md) before
building it. Do not load diagram mechanics merely because the plan discusses
architecture.

## Validate and hand off

Validate in this order:

1. **Argument:** reconcile the app against its coverage map and read it top to
   bottom. The intended reader must be able to recover the outcome, system
   shape, decisions, boundaries, and validation argument without interactive
   details.
2. **Reader effort:** inspect the live app at desktop and narrow widths. Apply a
   squint test: the primary focus, secondary groups, and reading order should
   remain apparent without reading the copy. Navigation and visual grammar must
   not compete with the plan.
3. **Technical integrity:** verify that the resolved design works as built.

Passing technical checks proves that the app works, not that the plan is clear.
Do not claim design readiness from green tests or a clean mechanical scan.

Treat feedback about purpose, audience, abstraction level, missing substance,
or needing a decoder as structural. Freeze component edits, redo the section
contract and representation choice, and repeat the whole-document review.
After two rejected structural versions, remove the failed construction and
rebuild minimally. Keep independent copy, styling, and rendering defects local.

After major structural work, give an independent cold reader the intended
reader role and task, canonical sources, and artifact—but not the suspected
defect or intended answer. Require answers with artifact evidence to the
relevant content-gate questions; a generic pass/fail is insufficient.
