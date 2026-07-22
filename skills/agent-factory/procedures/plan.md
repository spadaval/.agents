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

For later epics, record the outcome, known constraints, current unknowns, and
the evidence condition that should trigger expansion. Do not invent distant
tasks merely to make the mission look complete.

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

Publish semantic revisions only in a commissioned strategy session (defined in
the [Constitution](../constitution.md)):

1. Compare evidence with the active strategy and applicable ADRs.
2. State why implementation replanning is insufficient.
3. Resolve the choice, using `decide` when adversarial analysis is useful.
4. Publish the next revision with its rationale and affected work.
5. Reconcile the graph and surface the revision before affected execution
   resumes, unless immediate continuation was expressly commissioned.

During reconciliation, classify work as still valid, needing revision, no
longer advancing the strategy, or requiring follow-up. Preserve completed work
and evidence; do not rewrite history to fit the new route.

## Record Shape

- A mission owns the target state and scope boundary and links its strategy.
- An epic owns a coherent outcome branch and its expansion condition.
- An ordinary issue owns one assignable implementation, docs, migration, or
  artifact slice.
- A validation issue independently judges an outcome or explicit contract.
- An evidence record names the claim, action, result, and transcript or
  artifact.

Use repository tracker templates when present. Keep graph edits focused.

## Handoff

Report the strategy path and revision, decisions recorded, items and
dependencies changed, planning horizon, expansion conditions, paused work, and
checks run.
