# Repository Shape

Use this reference when installing Agent Factory or assessing whether a fresh
agent can orient, act, and validate work from durable repository sources.
Names may vary, but each responsibility needs one discoverable owner.

## Entry Map

A short root instruction file should point to, rather than duplicate:

- tracker identity, location, and live workflow/status entry points;
- product intent and domain language;
- the documentation index;
- product behavior and operator contracts;
- architecture boundaries and dependency direction;
- architecture decision records (ADRs);
- code and quality standards;
- validation routing and executable checks; and
- durable versus ignored/rebuildable state.

Keep this entry map compact. Repository-specific command cookbooks and product
policy belong in their owning executable help or documentation.

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

## Opinionated Baseline

A repository that expects durable, multi-person or multi-agent work should make
its governing knowledge visible in version control. A good default is:

| Location | Purpose | Keep it good by |
| --- | --- | --- |
| `AGENTS.md` (or equivalent root entry map) | Orient a fresh contributor, declare the Agent Factory tracker binding, and link every governing source. | Keeping it short, navigational, scoped, and free of copied workflow manuals. |
| `PRODUCT_INTENT.md` (or equivalent) | State the product's enduring purpose, users, desired outcomes, non-goals, and direction. | Changing it only when the product direction changes; link detailed behavior instead of growing a second product manual. |
| `CONTEXT.md` | Provide a glossary of domain terms, important distinctions, and resolved vocabulary used by plans, docs, and code. | Defining terms precisely, recording ambiguities, and removing or marking obsolete vocabulary. It is a reference, not a chronological decision log. |
| `docs/index.md` | Give the documentation tree a maintained, human-readable front door. | Explaining which document owns each concern and linking to the current source, not merely listing files. |
| `docs/product/` | Own product behavior, user and operator workflows, public contracts, and observable semantics. | Explaining what the product does without silently prescribing module layout, storage internals, or algorithms. |
| `docs/architecture/` | Own system boundaries, dependency direction, data ownership, implementation constraints, and recovery boundaries. | Explaining how the system is shaped without redefining user-visible behavior. |
| `docs/adr/` | Preserve durable decisions whose rationale would otherwise be rediscovered or contested. | Using stable identifiers and a status; keeping accepted decisions immutable and superseding them with a new ADR rather than silently rewriting history. |
| Quality and validation docs | Route standards, checks, proof expectations, and result interpretation. | Mapping claims to appropriate checks instead of treating one broad green suite as universal proof. |

Names and directories may differ. What matters is that each responsibility has
one obvious, durable home. Small repositories may begin with fewer files, but
should split a document when it starts serving conflicting owners or audiences.

### Product, Architecture, and Context

Keep the three forms of knowledge distinct:

- Product documentation answers what users and operators can expect, including
  behavior, workflows, and externally visible contracts.
- Architecture documentation answers how the implementation is constrained:
  component boundaries, dependency direction, durable versus derived state,
  and recovery or migration rules.
- `CONTEXT.md` supplies shared language. It defines the nouns and distinctions
  that make product requirements, architecture choices, tracker items, and code
  mean the same thing to different contributors.

Cross-links are expected. Duplicating a contract across all three is not. When
the boundary is unclear, choose the document that a future contributor would
consult to decide whether a proposed change is correct, then link from the
others.

### ADR Discipline

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

### Documentation as a Maintained System

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

## Documentation Responsibilities

| Source | Owns |
| --- | --- |
| Product intent | The product's purpose, users, desired outcomes, and non-goals. |
| Domain language | Stable terms and distinctions that plans and code must use consistently. |
| Product docs | Observable behavior, operator workflows, public contracts, and user-facing semantics: what the product does. |
| Architecture docs | System boundaries, components, data ownership, dependency direction, and implementation constraints: how the product is shaped. |
| ADRs | Costly, surprising, or repeatedly contested decisions, including context, choice, consequences, and supersession state. |
| Quality standards | Language, code, testing, review, and repository conventions that apply across changes. |
| Validation router | Which checks prove which claims, where proof is recorded, independence triggers, and result classification. |
| Tracker | Durable scope, outcomes, dependencies, lifecycle state, and evidence links for current work; provider-owned configuration encodes Agent Factory concepts when needed. |

Product and architecture docs may cross-link, but they should not silently own
each other's contracts. ADRs explain why a durable choice was made; they do not
replace the current product or architecture description.

## Durable State and Local State

Make the source of truth unambiguous. State that must survive a fresh clone,
review, or handoff belongs in tracked records. Caches, indexes, locks, command
diagnostics, generated output, and machine-local configuration should be
identified as derived or local, ignored when appropriate, and repairable from a
documented owner or command. Never make private machine state the only route to
current scope, decisions, or validation evidence.

## State Boundary

Identify canonical tracked records separately from local projections, caches,
locks, logs, and generated state. Rebuildable state should be ignored and have
one documented repair owner. A fresh agent must not need private machine state
to discover current scope or the repository's governing decisions.

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
