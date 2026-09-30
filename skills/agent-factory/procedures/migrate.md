# Migrate

Use this subskill when work intentionally removes or replaces an interface,
path, or data shape. That covers demolition, reconnecting consumers after a
break, and closing out a migration. Ordinary feature work does not need it.

## Principles

- **Name the breakage.** If something will be temporarily broken, say what,
  why, who reconnects it, and how you will know it is fixed. Unnamed breakage
  is just a regression.
- **Leave no residue.** Search code, tests, fixtures, docs, help text, config,
  and tracker items for references to the old path. A migration is finished
  when the old path is gone, not when the new one works.
- **Do not keep shims** unless compatibility is the explicit deliverable. If
  a temporary bridge is necessary, give it an owner and a removal condition.
- **Prefer the repository's own checks** to prove each step.

## Completion

Before declaring a migration complete, run the residue search and the
repository checks fresh. Get independent `validate` confirmation when the
migration changes a public, persisted, or cross-team contract. For
internal-only migrations, author-run proof plus the normal code review is
enough.

## Handoff

Also report what was removed or reconnected, the residue searches run and
their results, any remaining breakage with its owner, and the completion
proof.
