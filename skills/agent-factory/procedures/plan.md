# Plan

Use this subskill to shape new work: write or revise a mission strategy, lay
out epics, and create the first executable issues. Once execution is under
way, `orchestrate` maintains the plan itself. Come back to `plan` only for
strategic revisions.

## Layers

- **Strategy** is the governing intent: why, outcome, success criteria,
  shape, scope, and authority. For a substantial mission, write it as a short
  file (see [Strategic Plans](../references/strategic-plans.md)). For smaller
  work, the mission issue or PR description can serve.
- **Epics** are outcome-bearing increments that make the whole mission
  visible. A good epic is also a natural unit for one branch, one review
  batch, and, where needed, one validation pass.
- **Issues** are executable slices, created only as far ahead as evidence
  supports.
- **Validation issues**, when the tracker is used, hold an independent
  `validate` assignment for an epic or mission outcome.

Each record has one job; see [Tracker Records](../references/tracker-records.md)
for what goes in each. Detailed design goes in architecture docs or design
docs linked from epics, not in the strategy. Do not keep a separate
implementation-plan document, work briefs, or status tables alongside the
tracker.

## Initial Planning

1. Read the repository instructions, relevant product and architecture docs,
   ADRs, and existing tracker state.
2. State the outcome, target shape, what is out of scope, and how success
   will be shown.
3. Settle consequential choices that the first work depends on, using
   `decide` where there are several credible paths. Do not park such a choice
   in a future issue. If evidence is missing, plan the work that gathers it.
4. Sketch the remaining mission as draft epics, each with a preliminary
   outcome and its known unknowns. Do not invent tasks for distant epics.
5. Make the first increment executable. Prefer an increment that proves a
   representative user outcome end to end over one that only builds
   infrastructure, unless a current constraint requires the infrastructure
   first.

Use `$generate-html-plan` when an interactive visual plan would materially
help deliberation. Publish its result into the repository strategy before
execution.

## Ready Issues

An issue is ready when a worker without your context could execute it. Use
the [issue template](../references/tracker-records.md#issue): the goal and why
it matters, how you will know it is done, scope, context (including the target
environment when it affects risk), and dependencies.

Avoid placeholders such as "TBD", "handle edge cases", or "similar to #12".
If you cannot state something concretely, you have found an evidence
boundary. Make it a spike, a decision, or a blocked issue instead of
papering over it. Do not plan components whose only justification is
possible future work.

Before handing off, reread the ready issues. Check that together they cover
the increment's outcome, that their interfaces agree with one another, and
that each has a proof that could fail.

## Strategic Revision

When evidence shows the outcome, target shape, a boundary, or a governing
tradeoff must change:

1. Confirm you have authority: a human directed it, or the strategy grants
   it for this kind of change (see the
   [Constitution](../constitution.md#strategy-changes-deliberately)). Without
   authority, write the revision as a proposal and stop.
2. Explain why replanning within the current strategy is not enough.
3. Resolve the choice, using `decide` if the options are contested.
4. Edit the strategy in place and record what changed, why, and on whose
   authority, as described in
   [Strategic Plans](../references/strategic-plans.md#changing-it). Supersede
   any affected ADR.
5. Reconcile the tracker. Mark each affected item as still valid, needing
   revision, or obsolete. Preserve completed work and its evidence.

## Handoff

Also report the strategy location, decisions recorded, epics and ready issues
created, and open questions.
