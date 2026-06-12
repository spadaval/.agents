# Audit

Use this subskill to inspect architecture quality, identify complexity-fit
problems, and record evidence-backed findings without designing or implementing
refactors.

Use `implement` or `migrate` only after a tracker item already describes the
problem and desired work.

## Read First

- the mapped architecture quality vocabulary for value tests;
- the mapped domain context for product terms;
- the mapped architecture index for ownership and dependency direction;
- the mapped ADR directory for durable decisions.

## Audit Mode

Audit mode identifies problems, not fixes. For each finding, report:

- **Problem**: the complexity mismatch.
- **Evidence**: concrete files, packages, workflows, tests, searches, or caller
  behavior.
- **Quality smell**: shallow abstraction, information leakage, low cohesion,
  high coupling, change amplification, speculative abstraction, misplaced
  responsibility, legacy drag, or weak test interface.
- **Likely cause**: why the design creates the friction.
- **Value if fixed**: caller knowledge removed, code deleted, changes
  localized, tests improved, agent confusion reduced, or behavior made more
  reliable.
- **Risk**: what assumption could make a refactor premature or harmful, and
  what must be learned before shaping work.
- **Confidence**: high, medium, or low.
- **Next step**: no action, spike, artifact update, docs clarification, ordinary
  implementation item, demolition, reconnect, or closeout.

Be specific.
Recommend an implementation only if a solution is obvious.

## Value Discipline

Ignore implementation effort when deciding whether the architecture problem is
worth caring about. Cost affects tracker sequencing, not codebase value.

Reject candidates justified only by taste, symmetry, pattern completion,
smaller files, or speculative future variation. Prefer findings that reduce
cognitive load, change amplification, coupling, information leakage, or legacy
drag.

## Tracker Handoff

When the user asks to record findings, use the `plan` subskill conventions:

- create problem items when the problem is clear enough;
- create spike items when evidence or solution space is incomplete;
- create tasks to write or update the durable architecture artifact when a
  choice needs to be recorded;
- create demolition/reconnect/closeout items only after the target direction is
  clear.

Durable architecture choices belong in ADRs or target-state docs, not only in
tracker notes.
