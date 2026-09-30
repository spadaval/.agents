# Strategic Plans

Use a written strategic plan for a mission that is long-running, spans
several epics or systems, or involves contested tradeoffs. For smaller work,
the mission or epic description can do the same job, provided it still states
the outcome, target shape, boundaries, and how success will be proven.

## What It Owns

The strategy is the mission's governing intent. It covers what must be true
when the mission is done, the shape of the target system, the tradeoffs that
govern choices, and the boundaries. The tracker holds the current plan for
getting there: files, assignments, sequencing, and commands.

To decide whether a statement belongs in the strategy, ask whether the issue
graph could be rebuilt without changing it. If it could not, the statement is
strategy.

## Shape

Keep it in one stable file in the repository, and include only the sections
that carry meaning:

```md
---
status: draft | active | completed | superseded
mission: <tracker id>
---

# Outcome
What must be true when this is done, stated observably, including any
valuable partial outcomes.

# Target System
The durable shape: components, ownership, boundaries.

# Decisions and Tradeoffs
Governing choices, what wins when qualities conflict, and links to ADRs.

# Boundaries
In scope, out of scope, and the actual environment and exposure targeted.

# Adaptation
What must be preserved, what the orchestrator may change freely, and what
must come back to a human.

# Proof
Which claims must be demonstrated, and how, before the mission closes.

# Changes
Dated entries: what changed, why, and on whose authority.
```

State the real environment and exposure the mission targets. Do not add
machinery justified only by possible future work.

## Changing It

The strategy changes only with the authority described in the
[Constitution](../constitution.md#strategy-changes-deliberately): a human
directs the change, or the Adaptation section grants it. Record each change in
the Changes section. Git keeps the exact history, so do not create snapshot
files. After a change, reconcile affected tracker work before dispatching
more.

Summarize and link product docs, architecture docs, and ADRs rather than
copying them. If the strategy changes an accepted ADR, supersede that ADR
explicitly.

## Planning Incrementally

Plan the whole mission as outcomes, but create executable issues only up to
the nearest evidence boundary. That is the point beyond which unfinished
work, validation results, or an open decision could change the route. Keep
later epics as drafts with a preliminary outcome, constraints, and unknowns.
Expand each one when evidence justifies it.

Close the mission against demonstrated outcomes, not the number of issues
closed.
