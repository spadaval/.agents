# Migrate

Use this subskill for demolition, reconnect work, terminal migration
validation, or planned temporary breakage. Ordinary implementation does not use
this subskill.

## Classification

Before editing, classify the assigned work:

- **demolition**: removes an obsolete surface or path;
- **reconnect**: restores downstream behavior after intentional breakage;
- **terminal validation**: proves a migration is complete;
- **temporary breakage**: allowed only when named, scoped, owned, and
  recoverable.

Use repository-owned command and validation surfaces for exact checks. In
Atelier repositories, `atelier man admin`, `atelier man worker`, focused
`atelier issue show <objective-id>`, issue transition, `atelier check`, and
mapped validation docs own current tactical details. Use local-state repair
commands only when Atelier reports degraded local state or the migration
explicitly owns repair.

## Rules

- Do not preserve legacy behavior unless the tracker item explicitly makes
  compatibility the deliverable.
- Search for residue in docs, tests, code, help text, skills, and tracker work.
- Name expected breakage and its reconnect or terminal-validation owner.
- Attach first-class evidence for migration claims and classify failures as
  in-scope, expected temporary breakage, environment/tooling failure,
  pre-existing, deferred, or not applicable.

## Handoff

Report the classification, removed or reconnected surfaces, residue searches,
evidence IDs, remaining breakage, owner for each follow-up, and whether terminal
validation is complete.
