# Plan

Use this subskill when creating, splitting, reparenting, sequencing, clarifying,
or cleaning up tracker work. Planning decides what work exists, what is ready,
and how work is sequenced. It is not the implementation procedure for a named
code item.

## Inspect Before Mutating

Start with enough read-only context to prevent duplicate or contradictory graph
changes. Follow [repository workflow](../standards/repo-workflow.md) for git
worktree checks, and [tracker.md](../standards/tracker.md) plus
`AGENTFACTORY.md` for tracker mechanics, sync/check, and command conventions.
Then inspect the tracker and graph using the bound commands.

```bash
atelier issue list --status open
atelier issue list --ready
atelier mission list
atelier mission status <mission-id>
atelier mission show <mission-id>
atelier lint
atelier lint <id>
atelier issue search "<topic>"
atelier issue show <id>
```

Read parent epics, siblings, blockers, relevant ADRs, and target-state docs
before changing meaning or sequencing.

## Human Choice Gate

Important unresolved choices are not hidden implementation work. Mission
creation and activation must distinguish ordinary local execution choices from
autonomy-blocking product or architecture choices. If a choice needs durable
resolution, create a task whose deliverable is an artifact update such as an
ADR, spec, context file, or target-state document. Dependent implementation
stays blocked on that task until the human resolves the choice and the artifact
is updated.

Use this gate when a choice is high-leverage, hard to reverse, changes product
semantics, alters architecture, persistence, security, data-retention,
migration policy, validation policy, or public contracts, or has multiple
plausible approaches with meaningful tradeoffs. Resolve these choices before
mission start and do not activate the mission while they remain open.
If work can continue around the choice, split the independent slice and block
only the dependent items.

See [ready-work.md](../standards/ready-work.md) for ready epic and ready issue
criteria, and [work-item-authoring.md](../standards/work-item-authoring.md) for
writing mission, epic, executable issue, validation item, Outcome, Evidence,
and Notes text.

## Planning Flow

```text
Problem or Goal
      |
      v
[ Understand ] -- Read docs, ADRs, existing tracker items, current system
      |
      v
[ Shape ] -- Split, sequence, name scope, Outcome, Evidence, and Notes
      |
      v
[ Verify ready ] -- Can a future agent execute without hidden context?
      |
      v
[ Assign or queue ] -- Hand to orchestrator or leave in ready state
```

A ready item must answer what, why, in scope, out of scope, how to prove it, and
which subskill to load when assignment is not obvious. When the tracker supports
sectioned Markdown, executable work must include `Description`, `Outcome`,
`Evidence`, and optional `Notes`. Shape the item around desired outcome and
proof expectations; avoid prescribing exact implementation steps unless the
path is a deliberate architecture or product decision.

For Atelier mission work, ready selection starts from the active mission graph:

```bash
atelier mission status <mission-id>
atelier mission show <mission-id>
atelier issue show <candidate-id>
```

Use `atelier issue list --ready` to discover candidates or cross-check global
readiness, then keep only work linked to the active mission or add genuinely
mission-advancing work with `atelier mission add-work <mission-id> <issue-id>`.
Mission status should leave clear options for the orchestrator: ready now,
blocked by a named task, needs evidence, needs an explicit policy check, or
deferred/not applicable with an owner.

## Bulk Work Creation

When creating a planned group of tracker items with dependencies, prefer the
bulk or structured planning facility named by `AGENTFACTORY.md`. For Atelier,
create parent and child items explicitly, then add blocker relationships:

```bash
atelier issue create "Epic title" --issue-type epic
atelier issue create "Implement focused slice" --issue-type task --parent <epic-id>
atelier issue subissue <epic-id> "Validate integrated behavior" --issue-type validation
atelier issue block <blocked-id> <blocker-id>
atelier mission add-work <mission-id> <issue-id>
atelier export
atelier export --check
```

Use a bulk graph command only when the bound tracker supports it and any of
these apply:

- creating more than three items at once;
- assigning parent-child relationships while creating children;
- adding dependency edges between newly created items;
- using labels, priorities, assignees, custom metadata, or metadata references;
- wanting the graph to be created atomically.

For Atelier, dependency direction matches
`atelier issue block <blocked-id> <blocker-id>`: the first item is blocked, and
the second item is the prerequisite.

Use tracker import only for generated migrations, backups, and explicit-ID
plans.

## Reshaping Existing Items

Fix unclear scope, missing outcome/evidence expectations, or stale blockers on
any tracker item you edit. Preserve the item ID and human intent where possible.
Create a new repair issue instead of reopening misleading closed work unless
the old item was closed accidentally and no replacement would preserve the
audit trail better.

If meaning changes materially:

- update the Description, Outcome, Evidence, Notes, or relevant tracker fields;
- add a note explaining why it changed;
- adjust parent/blocker links;
- create follow-up items for split-out work;
- add a subskill recommendation or phase tag when useful.

Do not perform a broad tracker rewrite unless the user asks for one. Improve
the area you are already managing.

## Handoff

At handoff, the tracker graph must be clearer than when you started. Report
items created or changed, dependency changes, validation or lint run, remaining
ambiguity, and any follow-up artifact tasks needed.

Follow [repository workflow](../standards/repo-workflow.md) for the handoff
git check, and [tracker.md](../standards/tracker.md) for syncing or exporting
tracker state.
