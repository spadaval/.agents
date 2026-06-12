# Ready Work

Ready work can be executed from durable repository context without private chat
history or hidden choices. Use
[work-item-authoring.md](work-item-authoring.md) for the wording standard.

## Ready Epic

A ready epic:

- states the outcome in repository language;
- names governing docs, ADRs, or specs;
- splits execution into child issues with clear sequencing;
- owns every important outcome through child, validation, or closeout work;
- turns important unresolved choices into artifact-update tasks;
- blocks dependent implementation on those tasks;
- has validation and closeout work;
- avoids mixing unrelated outcomes.

An epic is not ready when workers must resolve high-leverage choices first.

## Ready Issue

A ready executable issue answers, without private context:

- Description, Outcome, Evidence, and optional Notes when the tracker supports
  sectioned Markdown;
- what must change;
- why it must change;
- what is in scope;
- what is out of scope;
- likely owned files, modules, commands, or workflows;
- constraining docs or parent outcome;
- how to prove completion;
- the subskill when not obvious.

A ready issue has no hidden unresolved choice. If implementation depends on one,
block it on an artifact-update task.

## Evidence Expectations

Evidence expectations describe observable proof, not agent effort:

- command output that must appear or must disappear;
- commands that must fail after removal, including the expected error shape;
- help text, docs, or Agent Factory guidance that must name the new workflow;
- source symbols, enum variants, config keys, or files that must not exist;
- tests, lint, export checks, scenario transcripts, or evidence records that
  prove the changed behavior;
- data migration expectations for committed tracker records.

Do not accept evidence that only says "document", "classify", "consider", or
"update guidance" for implementation-shaped work. Docs-only issues must name
the document or guidance surface and the assertion that will change.

Ordinary issues can close with proof on the issue. Risky, broad,
public-contract, process-policy, parent-level, epic, mission, docs/help parity,
stale-test, and migration claims require first-class evidence and should name
whether independent validation or review is required.

## Not Ready

Mark or reshape work before assignment when any of these are true:

- Outcome or Evidence is missing or only restates the title;
- validation proof is undefined;
- the item requires hidden chat context;
- dependencies are documented in prose but not represented as tracker blockers;
- the item contains multiple unrelated outcomes;
- implementation requires resolving a high-leverage choice first;
- the item conflicts with current docs, ADRs, or product language without
  owning the artifact update that changes them.

Planning may leave not-ready items queued, but orchestration should not assign
them as implementation work.
