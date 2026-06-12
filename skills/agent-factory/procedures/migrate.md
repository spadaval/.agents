# Migrate

Use this subskill for demolition, reconnect, closeout, and other planned migration
work where temporary downstream breakage is named, scoped, and handed off.

## First Classify The Item

Read the tracker item, parent epic, and nearby siblings before editing. Follow
[repository workflow](../standards/repo-workflow.md) for git worktree checks,
and [tracker.md](../standards/tracker.md) plus `AGENTFACTORY.md` for tracker
mechanics and sync/check commands. Then inspect the tracker:

```bash
atelier issue show <id>
atelier issue list --status open
atelier issue search "<legacy-or-target-term>"
```

Classify the work as one of:

- `demolition`: remove a legacy interface and intentionally break callers.
- `reconnect`: reconnect one owned slice to the target design after demolition.
- `closeout`: validate and clean up an integrated epic or phase.
- `ambiguous`: stop and resolve tracker/docs before editing.

Do not guess. If the item does not clearly say which class it is, inspect the
parent epic, current ADRs, and sibling items. If still unclear, update the
tracker or ask for an explicit human choice.

## Demolition Rules

For demolition items:

- Delete the named legacy interface in place.
- Remove replaced names, paths, interfaces, schema, package exports, and tests
  that only exist to keep the legacy interface alive.
- Do not reconnect unrelated downstream callers unless the item explicitly says
  to.
- Do not add compatibility aliases, deprecated wrappers, compatibility
  symlinks, transitional adapters, dual imports, old-path re-exports, or
  renamed wrappers.
- Do not write performative tests that only prove deleted code is still gone.
- Record expected downstream breakage and the reconnect/closeout item that owns
  it in tracker Notes, Outcome, or Evidence.

Broad checks may fail after a valid demolition only when the breakage is named
and owned. Capture the exact failure and owning reconnect item instead of hiding
it.

## Reconnect Rules

For reconnect items:

- Reconnect the named owned slice to the target design.
- Update docs and tests for the reconnected seam.
- Use the new target contracts directly.
- Remove nearby legacy references rather than preserving compatibility paths.
- File follow-up items for adjacent breakage outside the owned slice.

Focused validation proves the reconnected seam and satisfies the item's Outcome
and Evidence, not the entire migration unless the item is a closeout.

## Closeout Rules

For closeout items:

- Inspect the parent epic and all open/closed child items.
- Map every parent Outcome line to linked work and attached evidence before
  claiming closeout.
- Identify intentional temporary breakage recorded by demolition and reconnect
  items.
- Confirm target docs and ADRs describe the implemented state.
- Run broad command validation and scenario validation appropriate to the epic.
- Prove or classify every parent epic validation criterion as passed, failed,
  blocked, deferred, or not applicable.
- Attach first-class evidence for risky, broad, public-contract,
  process-policy, parent-level, epic, migration, and mission closeout claims;
  use independent validation or review where the tracker requires it.
- Clean up migration debris: stale imports, deleted terminology in current
  docs, dead tests, obsolete notes, unused exports, package manifest drift, and
  temporary exceptions.
- File tracker items for remaining work outside the closeout item's reasonable
  scope.

## Failure Classification

Classify command failures as:

- expected downstream breakage from demolition;
- in-scope blocker for the current reconnect or closeout;
- environment/tooling failure;
- unrelated pre-existing failure;
- newly discovered bug requiring follow-up.

Useful failure notes include command, package/file area, first concrete error,
whether it is expected, and tracker item that owns the fix.

## Handoff

For demolition handoff, include deleted legacy interfaces, validation run, known
broken callers or commands, and reconnect/closeout tracker item IDs.

For closeout handoff, include child items inspected, docs/ADRs updated or
confirmed, broad checks run, validation scenarios and result states, remaining
failures, and follow-up tracker item IDs.

Follow [repository workflow](../standards/repo-workflow.md) for the handoff
git check, and [tracker.md](../standards/tracker.md) for syncing or exporting
tracker state.
