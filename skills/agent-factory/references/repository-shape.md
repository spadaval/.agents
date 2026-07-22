# Repository Shape

Use this reference when installing Agent Factory or assessing whether a fresh
agent can orient, act, and validate work from durable repository sources.
Names may vary, but each responsibility needs one discoverable owner.

## Entry Map and Baseline

A repository that expects durable, multi-person or multi-agent work makes its
governing knowledge visible in version control. A short root instruction file
(such as `AGENTS.md`) points to — rather than duplicates — one discoverable
owner per responsibility:

| Responsibility | Typical home | Keep it good by |
| --- | --- | --- |
| Tracker identity, location, and workflow entry points | `## Agent Factory` in `AGENTS.md` (see below) | Selecting and linking, not copying command cookbooks |
| Product intent: purpose, users, outcomes, non-goals | `PRODUCT_INTENT.md` | Changing it only when product direction changes |
| Domain language and resolved vocabulary | `CONTEXT.md` | Defining terms precisely; removing or marking obsolete vocabulary |
| Documentation front door | `docs/index.md` | Naming which document owns each concern, not merely listing files |
| Product behavior, workflows, public contracts | `docs/product/` | Explaining what the product does, not module layout or internals |
| Boundaries, dependency direction, data ownership | `docs/architecture/` | Explaining how the system is shaped, not user-visible behavior |
| Durable decisions and rationale | `docs/adr/` | Stable identifiers and status; supersede, never silently rewrite accepted history |
| Standards and validation routing | Quality and validation docs | Mapping each claim to its check, proof destination, independence trigger, and result classification |
| Current work: scope, outcomes, dependencies, lifecycle, evidence links | The selected tracker | Encoding Agent Factory concepts the tracker lacks in provider-owned configuration |
| Durable versus rebuildable state | The entry map or validation docs | Giving derived state one documented repair owner |

Small repositories may begin with fewer files, but split a document when it
starts serving conflicting owners or audiences. Product, architecture, and
context knowledge answer different questions — what users can expect, how the
implementation is constrained, and what the shared words mean. Cross-links are
expected; duplicating a contract across all three is not. When the boundary is
unclear, choose the document a future contributor would consult to decide
whether a proposed change is correct, then link from the others.

## Agent Factory Binding

Onboarding should add or update a concise `## Agent Factory` section in the
applicable `AGENTS.md`; do not require a standalone Agent Factory binding file.
The section records only repository facts that a capable agent cannot safely
infer:

- the selected tracker and its repository, project, or local location;
- repository-specific encodings for missions, epics, validation work,
  dependencies, or evidence when the tracker does not model them directly;
- links to the validation and workflow policy that govern tracked work; and
- unusual setup, permission, or recovery constraints.

Keep tracker configuration with its natural owner: GitHub templates and labels
under GitHub-owned configuration, Atelier workflow in Atelier-owned
configuration, and branch or review policy in the repository's contributing or
workflow docs. `AGENTS.md` selects and links those sources instead of copying
them. In a monorepo, use the nearest scoped `AGENTS.md`; add a nested binding
only when that subtree genuinely uses different tracker or workflow conventions.

## ADR Discipline

Create an ADR when a decision is costly to reverse, non-obvious, likely to be
revisited, spans boundaries, changes a public or persistence contract, or
intentionally rejects a plausible alternative. A useful ADR contains:

1. A stable number or identifier and descriptive title.
2. Its status, such as proposed, accepted, superseded, or deprecated.
3. The context and forces that made a decision necessary.
4. The decision itself, stated plainly.
5. Consequences and meaningful tradeoffs.
6. A link to a superseding ADR when the decision changes.

ADRs explain why the current product or architecture is shaped as it is; the
product and architecture indexes explain what is currently true. Do not use an
ADR as an unindexed dumping ground for implementation notes, and do not rewrite
accepted history to conceal a changed decision.

## Documentation as a Maintained System

Treat documentation as a set of owned contracts, not a collection of notes.
Every durable document should have a discoverable route from the entry map or a
documentation index. Prefer focused pages with explicit ownership over one
large catch-all document. Remove, archive, or mark superseded guidance when it
is no longer authoritative; stale guidance is worse than an acknowledged gap
because it confidently misroutes work.

When a change alters product behavior, architecture boundaries, domain
language, durable state, validation policy, or a significant decision, include
the corresponding documentation or ADR update in the accountable work. A
separate follow-up is appropriate only when the repository records its owner
and dependency explicitly.

## Durable State and Local State

Make the source of truth unambiguous. State that must survive a fresh clone,
review, or handoff belongs in tracked records. Caches, indexes, locks, command
diagnostics, generated output, and machine-local configuration are derived or
local: identify them as such, ignore them when appropriate, and give each a
documented repair owner. Never make private machine state the only route to
current scope, decisions, or validation evidence.

## Readiness Test

A fresh agent should be able to answer, from the entry map and linked sources:

1. What is this product trying to achieve?
2. What do its core terms mean?
3. Where is current work and its lifecycle state?
4. Which behavior is public, and which constraints are architectural?
5. Why were important non-obvious choices made?
6. Which standards apply, and what proves this change?
7. Which state is durable, and how is local derived state repaired?
8. Which tracker is selected, and how does it represent Agent Factory work?

A missing responsibility is a repository-readiness gap even when the code is
otherwise buildable. Record the gap in the repository's tracker instead of
embedding a private replacement inside Agent Factory.
