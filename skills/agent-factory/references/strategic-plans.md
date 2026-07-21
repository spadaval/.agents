# Strategic Plans

Use a strategic plan for a long-running, multi-epic, cross-system, or
tradeoff-heavy mission. A compact mission body may serve the same purpose for
small work.

## Responsibility

The strategic plan is the mission's governing contract. It owns the outcome,
target system, tradeoffs, boundaries, adaptation authority, and assurance. The
tracker graph is the current implementation hypothesis.

Keep files, assignments, commands, and temporary sequencing in the tracker. If
the issue graph could be rebuilt without changing a statement, that statement
probably belongs in strategy.

## Format

Use one stable repository path and this compact shape:

```md
---
strategy: <stable-id>
mission: <mission-id>
revision: <integer>
status: draft | active | completed | superseded
sources: [<product, architecture, ADR, or plan references>]
---

# Outcome
# Target System
# Governing Decisions
# Boundaries
# Adaptation
## Must Preserve
## Managers May Change
## Return To Strategy When
# Assurance
# Revision History
```

Use only the sections that add meaning. State observable outcomes, durable
system shape, priority when qualities conflict, valuable partial outcomes, and
claims that must be proved.

## Revisions

Increment the revision when the outcome, target system, governing tradeoff,
boundary, assurance gate, or adaptation authority changes. Record what changed,
why, and which work must be reconsidered. Use version control for exact history;
do not create snapshot files by default.

Only `plan` may publish a semantic revision, and only in a commissioned
human-interactive strategic flow. Mark all other drafts as non-canonical. After
publication, surface the revision before affected execution resumes unless the
commission expressly includes immediate continuation.

Assignments name the strategy path and revision they use. After a revision,
reconcile affected work before dispatching it again.

## ADRs And Other Sources

Strategy is current and mission-scoped. ADRs preserve the rationale for
durable decisions; product and architecture docs describe what is currently
true across missions.

- Summarize and link governing sources instead of copying them.
- Record a mission-local decision in the plan.
- Record a decision that outlives the mission in its owning docs and use an ADR
  when its rationale would otherwise be lost or contested.
- Do not override an accepted ADR silently. Supersede it as part of the
  strategic revision.

## Interactive Plans

Use `$generate-html-plan` when visual, interactive deliberation is valuable.
The app may own the discussion; before execution, `plan` publishes its governing
content into the repository strategic plan and records the source revision.

## Incremental Planning

Plan the whole mission as outcomes, but expand ordinary issues only to the
nearest evidence boundary: the point beyond which unfinished work, validation,
or an unresolved decision could change the route.

Keep distant work as outcome-oriented epics with constraints, unknowns, and an
expansion condition. Expand, revise, defer, or supersede work as evidence
arrives. Close the mission against demonstrated strategic outcomes, not issue
count.
