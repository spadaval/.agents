# Plan

Use this subskill for initial planning, strategy publication or revision,
standalone graph shaping, and graph reconciliation after strategic change.
During execution, `orchestrate` owns routine graph maintenance.

## Planning Layers

The strategic plan is governing intent. Epics are the visible outcome map.
Ordinary issues are the evidence-backed execution horizon. Do not create a
second central implementation-plan document.

For a substantial mission, load
[Strategic Plans](../references/strategic-plans.md) and publish one active plan.
Resolve consequential choices with `decide`. Use `$generate-html-plan` when an
interactive visual plan would materially improve deliberation.

## Initial Planning

1. Read repository instructions, product and architecture docs, ADRs, tracker
   state, and validation policy.
2. State the finished outcome, target system, boundaries, tradeoffs, assurance,
   and adaptation authority.
3. Create outcome-oriented epics for the visible mission shape.
4. Create assignable issues only through the nearest evidence boundary.
5. Include the review and validation needed for that increment.

For later epics, record a meaningful preliminary outcome, known constraints,
and current unknowns, then leave the epic in the repository's draft planning
state. It may omit children, exact dependencies, and exact proof. Do not invent
distant tasks merely to make the mission look complete.

Expand an epic by refining its outcome and preservation claims, creating only
the immediate evidence-backed child work, representing known dependencies, and
choosing the proof route. Use the repository's ordinary transition from draft
to ready; do not add an expansion flag, approval, validation profile, or second
plan record.

An issue is ready when its outcome, scope, dependencies, governing strategy
revision, and proof expectations are clear enough for a Worker without private
planning context.

For issues inside the current evidence horizon, name exact owned surfaces where
known, consumed and produced interfaces, focused proof, validation commands or
scenarios, dependencies, and prohibited scope. Do not use placeholders such as
`TBD`, "add validation," "handle edge cases," or "similar to another issue."
Do not invent code or distant details merely to satisfy this rule; unresolved
information marks an evidence boundary, spike, decision, or blocked issue.

Before handoff, check current-horizon issues for outcome coverage, placeholder
language, interface consistency, and an observable failure or success oracle.
Repair the graph or mark the uncertainty explicitly.

## Durable Decisions

Resolve consequential choices before dependent implementation. Put
mission-local decisions in the strategic plan. Update product or architecture
docs for enduring contracts, and use an ADR when the rationale should survive.
Create separate artifact work only when the current assignment cannot make the
authorized update.

## Strategic Revision

Publish semantic revisions only with authority defined by the
[Constitution](../constitution.md): the active strategy explicitly delegates
the class of change or a human explicitly directs it.

1. Compare evidence with the active strategy and applicable ADRs.
2. State why implementation replanning is insufficient.
3. Resolve the choice, using `decide` when adversarial analysis is useful.
4. Publish the next revision with its rationale and affected work.
5. Record the authority and rationale, then reconcile the graph and surface the
   revision before affected execution resumes.

During reconciliation, classify work as still valid, needing revision, no
longer advancing the strategy, or requiring follow-up. Preserve completed work
and evidence; do not rewrite history to fit the new route.

## Record Shape

- A mission owns the target state and scope boundary and links its strategy.
- An epic owns an outcome-bearing delivery increment and one coherent branch,
  review, and validation boundary. Product-facing and pure-engineering outcomes
  use the same epic shape.
- An ordinary issue owns one assignable implementation, docs, migration, or
  artifact slice.
- A validation issue independently judges an outcome or explicit contract.
- An evidence record names the claim, action, result, and transcript or
  artifact.

Use repository tracker templates when present. Keep graph edits focused.

## Handoff

Report the strategy path and revision, decisions recorded, items and
dependencies changed, draft outcome map, executable horizon, paused work, proof
routes selected for newly ready epics, and checks run.
