# Orchestrate

Use this subskill to run a mission, epic, or multi-item workstream. The
orchestrator delegates, integrates, validates, replans, and closes work against
the active strategy.

## Operating Model

Assign one role and one Agent Factory subskill to each subagent. The
orchestrator may maintain its implementation graph; it does not need a separate
`plan` assignment for routine expansion or repair.

Establish the mission, strategy path and revision, current graph, worktree
state, and next coherent increment before dispatching mutating work. Integrate
results at useful checkpoints and preserve unrelated changes.

Load [Workspace Lifecycle](../references/workspace-lifecycle.md) before the first
mutating increment and at integration or closeout. Continue through ready work
without asking for routine permission between assignments. Pause only for a
genuine authority boundary, unresolved ambiguity that changes the result,
unsafe work, or a blocker that cannot be repaired within the active strategy.

## Replanning Loop

Replan after an integrated increment, material discovery, failed assumption,
new blocker, or strategic revision:

1. Compare the evidence with the active strategy revision.
2. Identify demonstrated outcomes and changed assumptions.
3. Classify the change.
4. Change only the smallest affected layer.
5. Reconcile ready, blocked, obsolete, and newly necessary work.
6. Dispatch the next coherent increment.

| Class | Action |
| --- | --- |
| Assignment repair | Clarify, retry, or reassign the same issue. |
| Implementation replan | Revise issues, dependencies, sequencing, or proof while preserving strategy. |
| Strategic replan | Pause affected work and route evidence through `decide` and `plan`. |
| Containment | Stop unsafe work immediately, then replan at the correct layer. |

Decide product and architecture questions that fall within the strategy's
adaptation authority. A change to outcome, target system, governing tradeoff,
boundary, assurance gate, adaptation authority, or an accepted ADR is
strategic. Continue independent work while a strategic question is resolved.

Preserve completed history and failed evidence. Supersede obsolete speculative
work instead of rewriting it to make the new route appear inevitable.

## Just-In-Time Expansion

Plan ordinary issues only to the nearest evidence boundary. Keep enough ready
work for current execution and the next coherent handoff without expanding
distant work prematurely.

Expand an epic when predecessor evidence arrives, an unknown is resolved, its
expansion condition becomes true, or the ready-work buffer is running low. For
each expansion:

1. Select an undemonstrated strategic outcome.
2. Choose the smallest increment that delivers value or reduces important
   uncertainty.
3. Confirm its decisions and dependencies are ready.
4. Create only the implementation, integration, review, and validation work
   needed for that increment.

If ready work runs out, diagnose whether the cause is missing detail, missing
evidence, a failed assumption, or a strategic question. Do not manufacture work
only to keep agents busy.

## Delegation

Every assignment names:

```text
Repository: <absolute path>
Selected tracker: <provider and repository, project, or path>
Mission and parent: <tracker IDs or none>
Strategy: <path>@<revision> | compact mission body:<reference> | none
Workspace/branch: <context>
Assigned issue(s): <exact IDs>
Role/subskill: <exactly one>
Model and reasoning: <choice and rationale>
Owned scope: <files, modules, commands, or workflows>
Out of scope: <boundaries>
Governing constraints: <relevant strategy or ADR constraints>
Replan trigger: <evidence or changed assumption, when applicable>
Expected proof: <observable result>
Evidence destination: <tracker or evidence target>
Independence: <none, review, validation, epic, or mission>
Dirty worktree rule: preserve unrelated changes
Handoff: <result, changes, evidence, commands, dirty state, commit, blockers,
          and exact follow-up>
```

Before delegation, load
[Submodel Selection](../references/submodel-selection.md). Name required docs,
ADRs, glossary terms, breakage, and validation criteria when relevant.

Route high-risk diffs to `review` and behavior claims to `validate`. Treat
Worker discoveries as evidence, not automatic mission scope.

When review or validation returns a finding, read the complete result, verify it
against the diff, outcome, and active strategy, and classify it before changing
work: repair the assignment, replan implementation, return to strategy, defer
with an owner, or reject with evidence. Do not accept findings performatively,
silently broaden scope, or let a validator decide mission critical-path scope.

## Closeout

Close against demonstrated strategic outcomes and required proof, not issue
count. Report the active strategy revision, delivered and deferred outcomes,
graph changes, evidence, commits, residual breakage, paused questions, next
increment, readiness checks, and worktree state.
