# Tracker Records

Use this reference when creating or updating missions, epics, issues,
validation items, evidence, and handoff notes. It defines what each record
contains; see [Atelier](atelier.md) for the commands. The headings below are
Atelier's typed body sections, so use them verbatim. Repository conventions
come first where they differ.

## Principles

- **Each fact lives in one place.** The strategy owns intent, the tracker owns
  status and sequencing, and docs own design. Link to the owner instead of
  copying. Copies drift, and then agents cannot tell which one is true.
- **Records are short.** A reader should see what the item is for, and what
  done means, in seconds. Leave out any optional section that would say
  nothing.
- **Status lives in state, not prose.** Use the record's status and native
  links, plus dated notes. Do not keep status tables in record bodies or
  docs.
- **Link, don't version.** Point to the strategy file, docs, and other records
  by path or ID, not by revision number.

Without Atelier, keep the same records as sections of a plan file, with a
status line on each.

## Mission

The mission record is a front door. It does not restate the strategy. Link
the strategy file through the record's `strategy` path field.

```md
## Outcome
<One paragraph: the outcome, in plain words.>

## Success criteria
<Only when there is no strategy file; otherwise the strategy owns them.>
```

Atelier accepts only Outcome, Success criteria, and Epics in a mission body,
plus the shared Notes and Close Reason. If there is no separate strategy file,
Outcome and Success criteria carry the strategy. When the mission needs more
of the [strategy template](strategic-plans.md#template), such as Shape,
Scope, or Authority, write a strategy file and link it; do not add those
sections to the mission. Execution work joins the mission through `advances`
links, so the Epics section is optional.

Post progress as dated notes. At meaningful points, note the success criteria
shown so far, current epics, blockers, and open questions.

## Epic

An epic is an outcome-bearing increment, and usually one branch, one review
batch, and one validation point.

```md
## Outcome
<What is true when this epic is done, observably.>

## Delivers
<Mission success criteria this advances, by number, e.g. S1, S3.>

## Scope
<Only if narrower than the mission's; otherwise omit.>

## Unknowns
<What must be learned before or during this epic. Omit when none.>

## Proof
<How the outcome will be shown: author proof plus review, or a linked
validation item.>

## Design
<Link to the design doc or ADR, if one exists.>
```

A draft epic may contain only Outcome and Unknowns. Before marking it ready,
fill in Proof, and add its immediate child issues and dependencies as native
links.

## Issue

An issue is one executable slice. A worker without your context should be
able to do it from the body alone. It is typically 10 to 30 lines.

```md
## Goal
<What to change and why it matters. One short paragraph.>

## Done when
<The observable proof: a test, command, check, or scenario that could fail
if the work were wrong or missing.>

## Scope
<What may change. Name anything that must not change, if it is not obvious.>

## Context
<Links to relevant files, interfaces, docs, ADRs, and findings. The target
environment, if it affects risk.>
```

Express dependencies as `blocked_by` links, not body text. Put follow-up
findings in new issues, not in the body of a closed one.

## Validation Item

Create one when an independent `validate` assignment is needed, such as for
mission acceptance or an epic that changes a user-facing outcome. It uses the
`validation` issue type and the ordinary issue body:

```md
## Goal
Check <referenced mission criteria or acceptance claims> independently.

## Done when
Each claim has an explicit result and linked evidence receipt; the handoff
states failures, blocked checks, and proof limits.

## Scope
<Checks and artifacts the validator may produce. Omit when unnecessary.>

## Context
<Links to the claims, the method and environment, and relevant design.>
```

Results live in evidence receipts, one per claim, attached to the validation
item. The validator notes the receipt IDs and its handoff on the item. Do not
rewrite acceptance intent to store results.

## Evidence

Record evidence in the tracker when later work or a later agent will rely on
it: epic or mission acceptance, independent validation, migrations, and
non-pass results. For ordinary slices, proof in the handoff is enough unless
the repository's merge policy requires a receipt.

A receipt states the claim, the check, the result, the commit, and links to
transcripts or artifacts. Use this vocabulary verbatim so evidence stays
searchable:

- Claim results: `pass`, `fail`, `blocked`, `not-applicable`.
- Cause of a failure: `defect in this change`, `expected breakage`,
  `environment/tooling`, `pre-existing`. `expected breakage` applies only on
  an isolated rewrite branch declared in the plan, never on the default
  branch.
- Finding dispositions: `FIX NOW`, `DEFER`, `NO ACTION`.

## Notes and Reviews

**Handoff:** the standard [handoff](../SKILL.md#handoff), appended as a dated
note when an assignment ends.

**Reviews and finding dispositions:** review events, not notes. See
[Finding Disposition](finding-disposition.md#recording).

## Deferred Follow-Up

A normal issue using the Issue template. The Goal says what was found, and the
Context links to the finding that produced it. It is not a blocker unless
someone explicitly makes it one.
