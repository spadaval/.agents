# Implement

Use this subskill for ordinary executable tracker items where the goal is to
change code, tests, or docs for one owned slice.

Do not use this subskill for graph planning, demolition, breaking migration,
closeout work, independent validation, or read-only review.

## Start Gate

Follow [repository workflow](../standards/repo-workflow.md) for git worktree
checks, and [tracker.md](../standards/tracker.md) plus `AGENTFACTORY.md` for
tracker mechanics and sync/check commands. Then verify the assigned item:

```bash
atelier issue show <id>
```

Claim only when the item is the work you are about to do:

```bash
atelier issue update <id> --claim
```

Do not scan the ready queue unless you are selecting work or coordinating the
graph. Full tracker lint is an orchestrator tracker-readiness check, not an
ordinary worker start gate.

## Scope Check

Before editing, verify:

- the item has no active blockers;
- the request matches the item scope;
- the package, app, workflow, file, or owned area is clear enough to start;
- acceptance criteria or intended behavior are discoverable;
- the expected proof for the owned slice is clear;
- the parent epic validation criterion advanced by the slice is clear, when
  applicable;
- the item is not really demolition, closeout, validation, review, or graph
  management work.

If the item is unclear, inspect only enough parent epic, sibling item, ADR, or
doc context to name the ambiguity. Do not reshape the graph unless explicitly
assigned planning work.

## Implementation Rules

- Update mapped docs before or alongside code when changing ownership,
  contracts, runtime flow, architecture, or user-visible behavior.
- During active rewrites, docs are the target design unless they are clearly
  stale, contradictory, or incomplete.
- Legacy compatibility is not preserved unless the assigned item explicitly
  makes compatibility the deliverable. Do not add shims, deprecated wrappers,
  compatibility symlinks, transitional aliases, dual paths, or old-path
  re-exports.
- Prefer one coherent owned slice over a narrow symptom patch.
- Bias toward test-driven development for behavior changes, bug fixes, contract
  changes, and non-trivial refactors.
- Skip tests only when the item is pure deletion, mechanical rename, docs-only,
  tracker-only, or the missing harness would add more noise than signal.

## Validation

Use the mapped validation router for check ownership. Run the narrowest checks
that prove the owned slice and satisfy the item's acceptance criteria. Do not
default to the whole suite unless the item asks for it.

If a broader check fails because the repo is intentionally mid-migration,
record the command, concrete failure shape, and item expected to reconnect or
close it out.

## Tracker Hygiene

Create follow-up tracker items for bugs, missing validation, cleanup work,
decision gaps, or newly discovered ordering constraints. Keep the current item
focused unless the user explicitly broadens scope.

Do not use interactive tracker commands; see [tracker.md](../standards/tracker.md)
for command conventions and [beads.md](../standards/beads.md) only for legacy
Beads-bound repositories.

## Handoff

Before stopping, leave concise handoff context:

- tracker item status;
- docs changed;
- code/test files changed;
- checks run and results;
- parent epic validation criterion advanced, when applicable;
- expected failures, if any;
- follow-up tracker item IDs.

Follow [repository workflow](../standards/repo-workflow.md) for the handoff
git check, and [tracker.md](../standards/tracker.md) for syncing or exporting
tracker state.
