# Migrate

Use this subskill for breaking changes, meaning work that removes or replaces
an interface, path, data shape, or behavior that other code or people rely on.
The goal is to reach the new state with the old one fully gone, while keeping
the default branch working at every step.

## Choose an Approach

Choose by who consumes the thing being changed. Atomic change is the default.
The others are for when it does not fit.

**1. Atomic change (the default).** When every consumer is code you can change
in this repository, change the interface and all of its callers in a single
PR. Let the compiler, type checker, tests, and searches find the callers. Split
a large change into reviewable commits, but merge it as one unit that is green
at the end. There is no breakage phase, no reconnect work, and no separate
cleanup.

**2. Expand and contract.** Use this when consumers cannot all change at once:
external or separately deployed clients, persisted data, mixed versions during
a rollout, or a change too large to review as one PR. Proceed in steps:

1. Add the new path alongside the old one.
2. Move consumers over in increments.
3. Remove the old path.

Every step is green and could ship on its own. Record when the old path will
be removed, what triggers the removal, and who owns it. It is scheduled
removal, not tolerated legacy. Data migrations follow the same pattern: write
both shapes or backfill, switch reads, then drop the old shape.

**3. Rewrite on an isolated branch.** Use this instead of an atomic change
when the new design shares little with the old one and keeping things working
during construction would cost more than it teaches. Build on the mission's
integration branch, or on one dedicated branch if there is no mission. Things
may be broken there until the rewrite lands, while the default branch stays
green the whole time. Record the choice and the reason in the plan, and merge only when the
rewrite is complete and reviewed.

Do not break the default branch deliberately. Failing checks there hide real
regressions and block everyone else.

## Principles

- **Leave no residue.** A migration is finished when the old path is gone, not
  when the new one works. Search code, tests, fixtures, docs, help text,
  config, and tracker items for references to it.
- **Do not keep shims** unless compatibility is the explicit deliverable. The
  temporary old path in expand-and-contract is the only exception, and it has
  a removal trigger and an owner.
- **Prefer the repository's own checks** to prove each step.
- **Keep it proportional.** One PR with a clear description is enough for an
  atomic change. Tracker items for each step are only worth creating for an
  expand-and-contract migration that spans several PRs or sessions.

## Completion

Before declaring a migration complete, run the residue search and the
repository checks fresh. Get independent `validate` confirmation when the
migration changes a public, persisted, or cross-team contract. For
internal-only migrations, author-run proof plus the normal code review is
enough.

## Handoff

Also report the approach chosen and why, what was removed, the residue
searches and their results, and, for expand-and-contract, what remains of the
old path and its removal trigger.
