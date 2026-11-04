# Plan

Use this subskill to shape new work: write or revise a mission strategy, lay
out increments, and create the first executable issues. Once execution is under
way, `orchestrate` maintains the plan itself. Come back to `plan` only for
strategic revisions.

## Layers

- **Strategy** is the governing intent: why, outcome, any success criteria,
  shape, scope, and authority. For a substantial mission, write it as a short
  file (see [Strategic Plans](../references/strategic-plans.md)). For smaller
  work, the mission issue or PR description can serve.
- **Increments** are outcome-bearing slices that make the whole mission
  visible. A good increment is also a natural unit for one branch, one review
  batch, and, where needed, one validation pass. In Atelier each is a parent
  issue whose children are its executable issues.
- **Issues** are executable slices, created only as far ahead as evidence
  supports.
- **Validation issues**, when the tracker is used, hold an independent
  `validate` assignment for an increment or mission outcome.

Each record has one job; see [Tracker Records](../references/tracker-records.md)
for what goes in each. Detailed design goes in architecture docs or design
docs linked from increments, not in the strategy. Do not keep a separate
implementation-plan document, work briefs, or status tables alongside the
tracker.

## Shaping a Mission

A mission is a container for changes that share a theme, plus a statement of
why they belong together. It does not need to be one deliverable; it needs to
be one thing a person can hold in their head, plan against, and finish.

- **One outcome.** State the outcome in a sentence or two that explains why
  each item is in the mission. If the sentence needs an "and" to cover
  unrelated surfaces, or some items only fit by stretching it, it is two
  missions or a mission plus loose backlog. Sharing an origin, such as the
  same audit or another mission's leftovers, is not a theme.
- **Finishable by its own work.** Everything in the mission can be done by
  the agents working it, or by asking the human a question they can answer
  now. Work that waits on calendar time, on other repositories or people
  adopting a change, or on measuring behavior after the mission ships cannot
  be finished this way. Put it in its own backlog item that says when to pick
  it up, outside the mission, so the mission can close.
- **Sized to finish.** A mission should close in weeks of work. When it grows
  past what one reviewer can judge in one debrief, split it along the
  outcome's natural seams rather than by item count.
- **Success criteria are optional.** Most missions need none: the outcome and
  each item's Done when already say what done means. Add a criterion only for
  a claim about the whole that no single item proves, such as an end-to-end
  scenario across items or a property every surface must share. Each one must
  be something the mission's work can make true and an agent can check when
  the mission closes: a test, a scenario, a measurement it can take, or a
  named human judgment the agent asks for. A criterion that restates the
  items adds nothing; one the work cannot reach stalls the mission, because
  the agent correctly stops and asks what it is expected to do.

## Initial Planning

1. Read the repository instructions, relevant product and architecture docs,
   ADRs, and existing tracker state.
2. State the outcome, target shape, what is out of scope, and how success
   will be shown.
3. Settle consequential choices that the first work depends on, using
   `decide` where there are several credible paths, and record each per the
   [record test](../references/tracker-records.md#decision). Do not park
   such a choice in a future issue; one only the human can make stays an
   open decision record. If evidence is missing, plan the work that gathers
   it.
4. Sketch the remaining mission as backlog increments, each with a
   preliminary goal and its known unknowns. Do not invent tasks for distant
   increments.
5. Make the first increment executable. Prefer an increment that proves a
   representative user outcome end to end over one that only builds
   infrastructure, unless a current constraint requires the infrastructure
   first.

Use `$generate-html-plan` when an interactive visual plan would materially
help deliberation. Publish its result into the repository strategy before
execution.

## Ready Missions

A mission moves from draft to ready (`atelier issue transition <mission>
ready`) when an orchestrator could start it without coming back to the human
to ask what the mission means. Check that:

- the outcome passes the [shaping](#shaping-a-mission) tests above, and every
  item in scope fits it;
- nothing in scope waits on calendar time, outside adoption, or post-ship
  measurement;
- the first items to be worked are [ready issues](#ready-issues); later items
  may stay in backlog with a preliminary goal and their unknowns;
- each choice the first work depends on is decided, and each question only
  the human can answer is an open decision record or a `needs-human` item,
  not an Unknown inside an issue;
- any success criteria meet the rule above;
- the planning has been independently reviewed and the human has approved
  the plan (`atelier review approve <mission>`).

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
that each has a proof that could fail. Then get the new planning
independently reviewed; work does not start on an issue until it has been
(see [Independent Review](../SKILL.md#independent-review)).

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
   [Strategic Plans](../references/strategic-plans.md#changing-it). Write a
   superseding decision record or ADR for any decision the change replaces.
5. Reconcile the tracker. Mark each affected item as still valid, needing
   revision, or obsolete. Preserve completed work and its evidence.

## Handoff

Also report the strategy location, decisions recorded, increments and ready issues
created, and open questions.
