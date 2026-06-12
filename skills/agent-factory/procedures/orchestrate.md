# Orchestrate

Use this subskill when you are the primary orchestrator for an epic or multi-item
workstream. You select, shape, assign, integrate, review, checkpoint, and steer.

In this system, **one agent → one role**. As orchestrator, do not personally
apply multiple role subskills to do delegated work. Spawn subagents and tell
them which agent-factory role/subskill to use. You may read files, run basic
commands, and perform high-context actions directly, but hand off all complex
work to subagents.

## Orchestrator Workflow

At a high level, your orchestration lifecycle follows these phases:

1. **Start Gate** — Verify the repo and tracker are clean and synced before any
   work begins. Identify the active mission or epic and fix sync issues or
   dirty worktrees before proceeding.
2. **Shape & Plan** — Review the active mission status, linked epics or work,
   open children, blockers, evidence, and overlap. Ensure every Outcome and
   Evidence claim is owned, close stale items, and define proof methods.
3. **Delegate** — Spawn subagents for each coherent slice of work. Assign one
   skill per subagent, provide exact tracker item IDs, owned files, constraints,
   expected proof, and whether independent validation or review is required.
4. **Integrate & Checkpoint** — Commit approved subtask results, sync tracker
   state using the bound sync/check commands, and verify the worktree before
   assigning the next worker.
5. **Review & Validate** — Route high-risk changes to the `review` subskill and
   scenario-centered proof to the `validate` subskill.
6. **Closeout** — Audit the mission contract line by line, run final
   validation, reconcile docs and ADRs, push tracker state, and hand off the
   completed epic with commits, closed items, evidence, and follow-up items.

The sections below provide detailed instructions for each phase.

## Start Gate

Before assigning work, prove the local repo and tracker can absorb a long run.
Follow [repository workflow](../standards/repo-workflow.md) for git worktree
checks, and [tracker.md](../standards/tracker.md) plus `AGENTFACTORY.md` for
tracker mechanics and sync/check commands. Then run the orchestrator-specific
checks below using the bound tracker commands:

```bash
atelier mission status <mission-id>
atelier mission show <mission-id>
atelier issue list --ready
atelier lint
atelier issue show <epic-or-candidate>
```

If tracker sync/check fails, stop orchestration and fix tracker state first. If
the worktree is dirty, classify each change before continuing and preserve
unrelated user changes.

## Active Mission Focus

Run a mission from the active mission or epic graph. Use
`atelier mission status <mission-id>` for option-oriented status: what is ready,
blocked, missing evidence, failing required policy checks, or waiting on operator
choice. Drill down with `atelier mission show <mission-id>` and
`atelier issue show <id>`.

Select worker issues from work linked to that mission or its epic children. Use
`atelier issue list --ready` only as a cross-check or when explicitly planning
across missions; do not let a global ready queue displace the active mission.
When a candidate is not linked to the mission, either add it with
`atelier mission add-work <mission-id> <issue-id>` because it advances the
mission, or leave it out of the run.

## Human Choice Gate

Before assigning implementation work, identify unresolved high-leverage choices
in the epic, children, docs, ADRs, or current code. If durable resolution is
needed, create a task whose deliverable is an artifact update such as an ADR,
spec, context file, or target-state document. The orchestrator must not start or
activate a mission while autonomy-blocking choices remain open. Resolve highly
consequential product, architecture, persistence, security, data-retention,
migration, and public-contract choices before mission start. Dependent work
proceeds only after the human operator resolves the choice and the artifact task
is complete.

Block dependent issues on the artifact task. If an independent slice does not
depend on the choice, keep it unblocked and document the boundary. When in
doubt, prefer a short human choice session over allowing subagents to invent product,
architecture, persistence, migration, security, or public-contract policy.

Use [ready-work.md](../standards/ready-work.md) when deciding whether an epic or
child issue is ready to assign.

## Orchestration Checklist

1. Run the bound tracker sync/check commands before graph shaping or worker
   assignment.
2. Review the active mission, parent epic, linked work, open children, blockers,
   sibling overlap, existing evidence, and closeout or validation items.
3. Ensure executable children use `Description`, `Outcome`, `Evidence`, and
   optional `Notes` when supported by the tracker, and that they name scope,
   out-of-scope work, expected proof, and independence needs.
4. Ensure every epic validation criterion is owned by child proof, a validation
   item, the closeout item, or an explicit blocked/deferred/not-applicable
   classification.
5. Shape or close duplicate, vague, or stale items before implementation starts.
6. Commit coherent implementation slices with the mapped tracker backup when
   the tracker update records the same work.
7. Use `show`, `status`, `list`, and `ready` commands for normal drill-down.
   Run raw workflow validators only as explicit advanced policy checks when
   the binding, assignment, or closeout contract requires them. They support
   closeout but do not replace attached proof.
8. Use `atelier finish <id>` for tracked work completion and
   `atelier issue close <id> --reason "..."` only when the item is actually
   complete and the required proof is attached or recorded.
9. Before closeout closes, run the mission contract audit, residue searches,
   docs reconciliation, broad validation, evidence attachment, tracker
   sync/export, and worktree verification.

## Subagent Delegation

Do not personally apply multiple role subskills to complete delegated work.
Spawn subagents and tell each one which agent-factory role/subskill to apply.
**One agent → one role.**

You may read files, run basic commands, and perform high-context actions
directly. A good guideline is to keep work yourself when a subagent would
require more than ~500 words of context to understand what to do. Hand off all
complex or long-running implementation work to subagents.

Assign one coherent owned slice per worker, usually one to three tracker items.
Be careful with parallel subagents. Use them only when readers are parallel or
writers are clearly disjoint.

Each worker prompt should include:

- exact tracker item IDs and parent epic;
- active mission ID and relevant mission status or blockers;
- assigned agent-factory role/subskill;
- owned files, modules, workflows, or architectural seam;
- what not to change;
- whether downstream breakage is expected;
- required docs, ADRs, or glossary terms;
- validation expected before handoff, including exact command output or
  artifact evidence to capture;
- evidence expected before handoff, including `atelier evidence add` and
  `atelier evidence attach` when first-class evidence is appropriate;
- whether the slice is ordinary work that may close with issue-local proof or
  risky, broad, public-contract, process-policy, parent-level, epic, or mission
  work that needs first-class evidence and independent validation or review;
- epic validation criterion advanced by the slice, when applicable;
- instruction that other agents may be editing the repo and unrelated work must
  not be reverted;
- instruction to list changed files, checks run, tracker state changes, risks,
  and follow-up needs.

## Review And Validation

Use the `review` subskill for high-risk diffs, public contracts, persistence,
security, migrations, broad refactors, and handoffs with uncertainty or skipped
checks.

Use the `validate` subskill for scenario-centered proof. Validators answer whether
the intended behavior works; they do not review the diff except as needed to
understand expected behavior.

## Checkpoint Commits

Commit after each approved subtask, tracker item, or small coherent item group.
Follow [repository workflow](../standards/repo-workflow.md) for the checkpoint
pattern. When tracker changes update the mapped tracker backup, stage it
explicitly. Before assigning the next worker, make sure the previous checkpoint
is either committed or deliberately reverted.

## Closeout

Before closing an epic or mission:

- run the closeout validation named by the tracker graph;
- perform a mission contract audit: map each parent Outcome line to linked work,
  attached evidence, and a `pass`, `fail`, `blocked`, `deferred`, or
  `not-applicable` classification;
- prove or classify every parent epic validation criterion;
- run raw workflow validators only when the binding or closeout item requires
  an advanced policy check;
- run targeted residue searches for removed terms, legacy imports, and old
  contracts;
- reconcile docs, ADRs, glossary, and tracker notes with the implemented state;
- confirm mission status, linked blockers, work state, and evidence with
  `atelier mission status <id>`;
- commit remaining tracker backup changes;
- follow [repository workflow](../standards/repo-workflow.md) for the handoff
  git check, and [tracker.md](../standards/tracker.md) for syncing or exporting
  tracker state.

Final handoff names completed epic, commits, closed items, evidence records,
validation commands, residual breakage, follow-up items, and tracker sync/check
status.
