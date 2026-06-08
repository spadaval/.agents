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
atelier issue ready
atelier lint
atelier lint <id>
atelier issue search "<topic>"
atelier issue show <id>
```

Read parent epics, siblings, blockers, relevant ADRs, and existing decision
items before changing meaning or sequencing.

## Planning Flow

```text
Problem or Goal
      |
      v
[ Understand ] -- Read docs, ADRs, existing tracker items, current system
      |
      v
[ Shape ] -- Split, sequence, name scope and acceptance criteria
      |
      v
[ Verify ready ] -- Can a future agent execute without hidden context?
      |
      v
[ Assign or queue ] -- Hand to orchestrator or leave in ready state
```

A ready item must answer what, why, in scope, out of scope, how to prove it, and
which subskill to load when assignment is not obvious.

## Bulk Work Creation

When creating a planned group of tracker items with dependencies, prefer the
bulk or structured planning facility named by `AGENTFACTORY.md`. For Atelier,
create parent and child items explicitly, then add blocker relationships:

```bash
atelier issue create "Epic title" --issue-type epic
atelier issue create "Implement focused slice" --issue-type task --parent <epic-id>
atelier issue subissue <epic-id> "Validate integrated behavior" --issue-type validation
atelier issue block <blocked-id> <blocker-id>
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

Fix unclear scope, missing acceptance criteria, or stale blockers on any tracker
item you edit. Preserve the item ID and human intent where possible.

If meaning changes materially:

- update the description or acceptance criteria;
- add a note explaining why it changed;
- adjust parent/blocker links;
- create follow-up items for split-out work;
- add a subskill recommendation or phase tag when useful.

Do not perform a broad tracker rewrite unless the user asks for one. Improve
the area you are already managing.

## Handoff

At handoff, the tracker graph must be clearer than when you started. Report
items created or changed, dependency changes, validation or lint run, remaining
ambiguity, and any follow-up decisions needed.

Follow [repository workflow](../standards/repo-workflow.md) for the handoff
git check, and [tracker.md](../standards/tracker.md) for syncing or exporting
tracker state.
