# Garden

Use this subskill to keep one repository healthy on a cadence, usually daily:
review how merged work was built, turn repeated mistakes into fixes at the
level that stops them, prune rules and backlog that no longer earn their keep,
and keep the repository's verify skill current. Review catches defects one
change at a time; gardening catches what only shows across changes.

## A Run

Each run covers one repository. Review what merged since the last run, whose
pull request or note gives its date (the last 7 days on a first run), and count
mistake classes over the last 30 days. Open at most one pull request,
reviewed like any change, and file the rest as issues. Never touch a branch in
flight: what concerns open work goes to its owner as an issue or note.

## Construction Review

Read each merged change for how it was built: ownership and boundaries,
duplicate sources of truth, residue and stale docs. Weigh what it cost against
what it bought, since a large fix for a rare case, or hardening of a path
planned for removal, is a finding even after it merged. File each with its
evidence.

## Mistake Classes

A class is a kind of mistake, not one instance: the same review finding in
different changes, a check that keeps failing the same way, a repeated revert.
Gather them from review records (`atelier review list`), reverts, failed checks
and debriefs. Act on a class that happened at least twice in the window, and
fix it at the highest level that works, since each level below depends on
someone reading or running something:

1. **Architecture:** make the mistake impossible, with a type, a single owner
   or by removing the surface.
2. **A check:** a test, lint or gate that fails when it happens.
3. **A doc:** a rule where the agent who would make it reads, with its reason.

Delete a rule, check or doc line whose mistake can no longer happen, saying in
the pull request why it cannot: every rule costs each reader, and stale ones
hide the live ones.

## Backlog and Deferred Findings

Sweep deferred findings and the backlog, and propose to whoever owns the plan,
with the reason, superseding what other work already did and declining what a
later change made moot or whose cost now outweighs its value.

## Verify Skill

Keep the repository's verify skill and its feature map current with what
merged, as [the standard](../references/verify-skill.md) describes, and run it
end to end. If the repository has none, propose one as an issue.

## Handoff

Also report the window reviewed, the classes found and the level each was fixed
at, rules deleted, issues filed, declines proposed, and the pull request.
