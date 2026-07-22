# Migrate

Use this subskill for demolition, reconnect work, planned temporary breakage,
or migration closeout. Ordinary implementation does not use this subskill.

## Classification

Before editing, classify the assigned work:

- **demolition**: removes an obsolete surface or path;
- **reconnect**: restores downstream behavior after intentional breakage;
- **terminal validation**: proves a migration is complete;
- **temporary breakage**: allowed only when named, scoped, owned, and
  recoverable.

Terminal validation runs as an independent `validate` assignment; the Worker
that performed the migration never solely proves it complete.

Use repository-owned command and validation surfaces for exact checks. Use
local-state repair only when diagnostics report degraded derived state or the
migration explicitly owns repair.

## Rules

- Search for residue in docs, tests, code, help text, skills, and tracker work.
- Name expected breakage and its reconnect or terminal-validation owner.
- Attach first-class evidence for migration claims and classify failures with
  the shared [failure classification](../references/tracker-commands/evidence-tracking.md)
  vocabulary.

## Handoff

Report the classification, removed or reconnected surfaces, residue searches,
evidence IDs, remaining breakage, owner for each follow-up, and the
terminal-validation assignment, its owner, or its result.
