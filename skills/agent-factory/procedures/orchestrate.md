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
   work begins. Fix sync issues or dirty worktrees before proceeding.
2. **Shape & Plan** — Review the parent epic, open children, blockers, and
   overlap. Ensure every validation criterion is owned, close stale items, and
   define acceptance criteria and proof methods.
3. **Delegate** — Spawn subagents for each coherent slice of work. Assign one
   skill per subagent, provide exact tracker item IDs, owned files, constraints,
   and validation expectations.
4. **Integrate & Checkpoint** — Commit approved subtask results, sync tracker
   state using the bound sync/check commands, and verify the worktree before
   assigning the next worker.
5. **Review & Validate** — Route high-risk changes to the `review` subskill and
   scenario-centered proof to the `validate` subskill.
6. **Closeout** — Run final validation, reconcile docs and ADRs, push tracker
   state, and hand off the completed epic with commits, closed items, and
   follow-up items.

The sections below provide detailed instructions for each phase.

## Start Gate

Before assigning work, prove the local repo and tracker can absorb a long run.
Follow [repository workflow](../standards/repo-workflow.md) for git worktree
checks, and [tracker.md](../standards/tracker.md) plus `AGENTFACTORY.md` for
tracker mechanics and sync/check commands. Then run the orchestrator-specific
checks below using the bound tracker commands:

```bash
atelier issue ready
atelier lint
atelier issue show <epic-or-candidate>
```

If tracker sync/check fails, stop orchestration and fix tracker state first. If
the worktree is dirty, classify each change before continuing and preserve
unrelated user changes.

## Orchestration Checklist

1. Run the bound tracker sync/check commands before graph shaping or worker
   assignment.
2. Review the parent epic, open children, blockers, sibling overlap, and
   existing closeout or validation items.
3. Ensure executable children name scope, out-of-scope work, acceptance
   criteria, and proof commands or proof method.
4. Ensure every epic validation criterion is owned by child proof, a validation
   item, the closeout item, or an explicit blocked/deferred/not-applicable
   classification.
5. Shape or close duplicate, vague, or stale items before implementation starts.
6. Commit coherent implementation slices with the mapped tracker backup when
   the tracker update records the same work.
7. Use the bound close command, such as
   `atelier issue close <id> --reason "..."`, for completion; use the bound
   update command, such as `atelier issue update`, for field edits and claiming.
8. Before closeout closes, run residue searches, reconcile docs, run broad
   validation, sync/export tracker state, and verify the worktree is clean.

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
- assigned agent-factory role/subskill;
- owned files, modules, workflows, or architectural seam;
- what not to change;
- whether downstream breakage is expected;
- required docs, ADRs, or glossary terms;
- validation expected before handoff;
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

Before closing an epic:

- run the closeout validation named by the tracker graph;
- prove or classify every parent epic validation criterion;
- run targeted residue searches for removed terms, legacy imports, and old
  contracts;
- reconcile docs, ADRs, glossary, and tracker notes with the implemented state;
- commit remaining tracker backup changes;
- follow [repository workflow](../standards/repo-workflow.md) for the handoff
  git check, and [tracker.md](../standards/tracker.md) for syncing or exporting
  tracker state.

Final handoff names completed epic, commits, closed items, validation commands,
residual breakage, follow-up items, and tracker sync/check status.
