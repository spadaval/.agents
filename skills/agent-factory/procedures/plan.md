# Plan

Use this subskill to create, split, sequence, clarify, or repair durable work.
Planning decides what work exists, why it exists, and what finished should look
like. It is not the implementation procedure for a named code item, and it does
not prewrite validation transcripts for later agents.

## Stance

- Start from repository instructions, the tracker's current status surfaces, and
  the relevant product, architecture, ADR, and validation docs.
- In Atelier repositories, use `atelier man manager` for current command
  routing and focused `atelier issue show <objective-id>` or focused
  `show`/`list` commands for drill-down.
- Write the desired finished state first. Avoid replacing the target state with
  broad process language, private implementation steps, or boilerplate proof
  systems unless that exact path is the decision being tracked.
- High-leverage product, architecture, persistence, security, migration,
  validation, or public-contract choices need durable artifact-update work.
  Block dependent implementation on those tasks.
- When planning work, include scoped cleanup or refactoring when adjacent code
  makes the intended change harder to understand or trust. Cleanup should be
  purposeful and bounded, not drive-by churn.
- Keep graph edits focused. Do not rewrite unrelated tracker areas while
  clarifying one workstream.

## Record Shape

An assignable item must be understandable without private chat history. It
names target state, scope, non-scope, dependencies, and the subskill when that
is not obvious. If the tracker has canonical sections or templates, use them
instead of inventing parallel formatting.

Use the smallest record shape that makes accountability clear:

- Mission: a target state and scope boundary for work large enough to need at
  least one epic or equivalent root work item. Mission scope is the direct
  `advances` links plus the descendants of those roots.
- Epic: a coherent branch, review, or integration package under a mission.
- Ordinary issue: one accountable implementation, docs, migration, or artifact
  update slice with a local Outcome.
- Validation issue: independent judgment derived from the target Outcome or
  explicit product contract being validated.
- Evidence record: a receipt from a check that actually ran. It records the
  claim checked, action taken, result, and transcript or artifact.

Do not add `Evidence` or `Validation` prose as default paperwork for every new
mission or ordinary issue. Workers and validators choose and record proof while
doing the work; planners write the target state and only call out proof when a
specific contract, risk, or workflow gate requires it.

## Mission Creation

Create a mission only when the objective is larger than a single accountable
issue and needs at least one epic or equivalent workstream beneath it. Smaller
objectives should remain ordinary issues.

Before writing the mission, resolve the applicable source of truth:

- Product intent and target behavior from the repository product docs.
- Domain language from repository context docs.
- Current lifecycle, closeout, and command details from the tracker command
  surfaces.
- Architecture, ADR, and validation docs for decisions that affect contracts,
  persistence, workflow policy, public commands, or agent process.

If those sources conflict or leave an important product or architecture choice
open, create artifact-update work and block dependent implementation on it.
Do not bury unresolved decisions inside implementation tasks.

A mission must make the desired finished state concrete enough for another
agent to plan, implement, and validate without private context. Capture:

- The outcome the repository should have when the mission is complete.
- Constraints and explicit non-scope.
- Current risks or unknowns that could change sequencing.
- The linked epics, implementation issues, documentation work, validation work,
  migration work, review work, or audit work needed to reach the outcome.

Validation work should derive its checks from the mission or issue `Outcome`.
Only predefine a scenario, command, file, artifact, or evidence class when it is
itself the product contract or a known risk that would otherwise be ambiguous.
A criterion such as "the feature works end-to-end" is not ready because it does
not describe the finished behavior; rewrite it as the user-visible state,
command result, file content, workflow transition, or documentation surface that
must be true.

For missions that touch public command behavior, workflow policy, storage or
migration contracts, agent guidance, validation rules, or multiple subsystems,
include explicit closeout coverage for an independent validation or audit issue.
Do not add audit work by rote to tiny missions; when omitting it, the mission
should still name the closeout proof that makes the omission reasonable.

## Examples

Concrete mission outcome:

```text
Outcome
-------
`atelier issue show <mission-id>` explains mission scope from direct `advances`
links, reports linked root work and descendants once, and points operators to
the next lifecycle command without requiring private coordinator notes.
```

Vague mission anti-example:

```text
Outcome
-------
Improve mission architecture and validation confidence across the workflow.
```

That anti-example does not say what command, record, or operator behavior must
change.

Concrete ordinary issue outcome:

```text
Outcome
-------
`atelier man worker` lists `atelier work ready` as the normal ready-work entry
point and no longer routes normal worker guidance through deprecated queue flag
forms.
```

Vague ordinary issue anti-example:

```text
Outcome
-------
Clean up worker guidance and make it more aligned with the new process.
```

Concrete validation issue outcome:

```text
Outcome
-------
An independent validator compares the updated planner, product, quality, and
help text against the simplified mission model, classifies mismatches as
`pass`, `fail`, `blocked`, or `deferred`, and records the command transcript or
diff locations inspected.
```

## Handoff

Report items created or changed, dependency changes, unresolved choices,
validation or lint run, evidence receipts produced, and follow-up artifact
tasks.
