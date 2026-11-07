# Migrate

Use this subskill for a breaking change: removing or replacing an interface,
path, data shape or behavior that other code or people rely on, reaching the new
state with the old one fully gone.

## Choose an Approach

Choose by who consumes the thing being changed:

1. **Atomic change, the default,** when every consumer is code you can change in
   this repository: change the interface and all its callers in one PR, letting
   the compiler, type checker, tests and searches find them. Split a large
   change into reviewable commits, but merge it as one unit that is green at the
   end.
2. **Expand and contract** when consumers cannot all change at once: external or
   separately deployed clients, persisted data, mixed versions during a rollout,
   or a change too large to review as one PR. Add the new path beside the old,
   move consumers over in increments, then remove the old path, each step green
   and shippable on its own. Data follows the same pattern: write both shapes or
   backfill, switch reads, then drop the old shape. Record when the old path
   goes, what triggers its removal and who owns it; it is the only shim this
   allows.
3. **Rewrite on an isolated branch** when the new design shares little with the
   old and keeping things working meanwhile would cost more than it teaches.
   Declare it in the plan; things may be broken there until it merges, complete
   and reviewed. Atelier cannot merge such a branch yet, so with Atelier prefer
   the other two and ask the human before planning one.

## Completion

A migration is finished when the old path is gone, not when the new one works.
Search code, tests, fixtures, docs, help text, config and tracker items for
references to it, and run the residue search and the repository's checks fresh
before calling it complete. Get independent `validate` confirmation when the
migration changes a public, persisted or cross-team contract; for an internal
one, author-run proof and normal review suffice. Tracker items per step are
worth creating only for an expand-and-contract migration that spans several PRs
or sessions.

## Handoff

Also report the approach and why, what was removed, the residue searches and
their results, and, for expand and contract, what remains of the old path and
its removal trigger.
