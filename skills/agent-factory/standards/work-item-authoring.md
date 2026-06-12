# Work Item Authoring

Use this standard when writing or reshaping missions, epics, issues, validation
items, documentation tasks, and follow-up work. The goal is to leave enough
durable context that another agent can execute and validate work without private
chat history.

## Core Rule

Write the desired world and the expected proof. Do not turn the tracker item
into a step-by-step implementation script unless the exact path is itself the
decision being recorded.

- **Description** explains the problem, scope, constraints, and why the work
  exists.
- **Outcome** describes what must be true when the work is complete.
- **Evidence** describes how an independent agent could prove or disprove that
  outcome.
- **Notes** hold context, constraints, tradeoffs, or non-goals that do not
  belong in the completion criteria.

Avoid competing sections such as `Acceptance Criteria`, `Validation Criteria`,
or `Definition of Done` unless the bound tracker explicitly requires them. When
the tracker supports sectioned Markdown, executable work must use
`Description`, `Outcome`, `Evidence`, and optional `Notes`.

## Proof Rule

Ordinary executable work closes with proof on the issue that owns the change.
That proof can be a durable note only when the work is trivial and the note
captures the exact observable result. Use first-class evidence when the proof
is non-trivial, a future worker must inspect it, or the claim spans more than
the local issue.

Risky, broad, public-contract, process-policy, migration, docs/help parity,
stale-test, parent-level, epic, and mission claims need stronger proof:

- attach first-class evidence to the item that makes the claim;
- name whether independent validation or review is required;
- map parent Outcome lines to child work and attached evidence before closing;
- use a separate validation or closeout item when the implementer should not
  validate the claim alone.

Tracker workflow validators, when a binding provides them, are policy checks.
They can support closeout, but they do not replace attached proof for the
Outcome being claimed.

## Missions

A mission describes a coordinated target state. It should name:

- the user-visible or repository-visible state that should exist after the
  mission;
- the major workstreams or epics that advance that state;
- constraints and risks that affect sequencing;
- closeout evidence expected across the mission.

Mission evidence should require a closeout audit, not prescribe every child
implementation. A good mission can be validated by asking: "Can I map every
mission outcome to linked work and attached proof?"

Mission Outcome bullets should be broad enough to survive implementation
discovery and concrete enough to audit line by line. Mission Evidence should
name the required closeout proof, independent validation needs, and evidence
records or transcripts expected before the mission closes.

## Epics

An epic groups related outcomes and delegates concrete proof to children. It
should name:

- the cohesive product, process, or architecture result;
- the child work needed to make that result real;
- the observable behavior that proves the epic is complete;
- any known dependencies or deferred choices.

An epic is too vague when children can close while the parent outcome remains
unproven. An epic is too rigid when it dictates internal implementation details
that workers could reasonably discover during execution.

Epic Evidence should say which child proof, validation item, closeout item, or
attached evidence will prove each parent claim. If an epic changes public
contracts, process policy, or cross-cutting behavior, include independent
review or validation in the evidence expectation.

## Executable Issues

An executable issue should be ready for one worker or one small worker group. It
should answer:

- what must change and why;
- what is in scope and out of scope;
- what observable behavior must exist or disappear;
- what proof would convince a skeptical validator.

Outcome bullets should describe externally visible behavior, durable state, or
policy results. Evidence bullets should name proof classes such as command
transcripts, failing and passing scenarios, docs/help parity checks, targeted
tests, migration diff inspection, evidence records, screenshots, or review
artifacts.

Do not require exact file names, function names, test names, or implementation
steps unless those are part of the public contract or architecture decision.

Executable issues should close only after their Evidence section is satisfied
or explicitly classified as deferred, blocked, or not applicable with an owner.
If the work proves only a narrow local slice, do not let the issue claim parent
or mission completion.

## Validation Items

A validation item starts from claims, not from the implementation summary. It
should require the validator to:

- verify each Outcome bullet line by line;
- classify each relevant outcome as `pass`, `fail`, `blocked`, `deferred`, or
  `not-applicable`;
- capture the command transcript, manual steps, screenshots, or artifact paths
  that make the result reproducible;
- test positive behavior and negative behavior where both matter;
- inspect docs, help, tests, ignored tests, or process guidance when those are
  part of the outcome;
- create or identify follow-up work for real failures;
- avoid fixing defects while validating unless explicitly assigned
  implementation work.

## Outcome Wording

Good Outcome text names observable completion behavior:

- "Primary help lists `issue show`, `issue list`, and `issue close` and does
  not list removed aliases."
- "Mission closeout refuses to pass when an open linked issue lacks attached
  evidence."
- "Agent Factory assignments tell implementers whether independent validation
  is required before close."

Avoid Outcome text that only names effort:

- "Update the CLI."
- "Improve validation."
- "Make Agent Factory better."

## Evidence Wording

Prefer Evidence text that names the behavior under test:

- "Transcript proves `start` rejects a malformed issue and names the missing
  section."
- "Help transcript proves removed commands are absent from primary help."
- "Docs/help parity check lists each documented command surface and its matching
  CLI help output."
- "Migration diff inspection proves legacy frontmatter was removed without
  inventing false outcomes."

Avoid evidence that only names effort:

- "Run tests."
- "Update docs."
- "Verify behavior."
- "Make sure this works."

Broad checks are useful as supporting evidence, but they do not replace scenario
proof for the behavior the item claims to change.

## Notes Wording

Use Notes for constraints, non-goals, sequencing caveats, known risks,
representative examples, or historical context. Notes do not prove completion
and should not hide requirements that belong in Outcome or Evidence.

## Repair Work And Reopening

Create a new repair issue when closed work was misleading, incomplete, or needs
new scope. Reopen a closed issue only when it was closed accidentally and no
replacement issue or evidence history would be obscured. Repair issues should
name the failed claim, the observable repaired outcome, and the evidence needed
to prove the repair.
