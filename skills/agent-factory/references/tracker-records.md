# Tracker Records

Use this reference when creating or updating missions, increments, issues,
validation items, decisions, evidence, and handoff notes. It defines what each
record contains; see [Atelier](atelier.md) for the commands. The headings
below are Atelier's typed body sections, so use them verbatim. Repository
conventions come first where they differ.

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
the strategy file through the mission's strategy path (see
[Strategic Plans](strategic-plans.md#where-it-lives)).

```md
## Outcome
<One paragraph: the outcome, in plain words.>

## Success criteria
<Only when there is no strategy file; otherwise the strategy owns them.>

## Background
<Research, references, and motivation the mission's work shares. Omit when
none.>
```

Atelier accepts only these sections in a mission body, plus the shared Notes
and Close Reason. If there is no separate strategy file, Outcome and Success
criteria carry the strategy. When the mission needs more of the
[strategy template](strategic-plans.md#template), such as Shape, Scope, or
Authority, write a strategy file and link it; do not add those sections to
the mission. Work joins the mission through `advances` links; missions are
never parents.

Post progress as dated notes. At meaningful points, note the success criteria
shown so far, current increments, blockers, and open questions.

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

## Unknowns
<Unverified assumptions and open questions. Omit when none.>

## Design
<Link to the design doc or ADR, if one exists.>

## Background
<Research or prior work the reader needs. Omit when none.>
```

Only Goal and Done when are required; leave out any optional section that
would say nothing. Express dependencies as `blocked_by` links, not body text.
Put follow-up findings in new issues, not in the body of a closed one. Mark
work only a human can do, such as an account approval or a step at a
particular machine, with the `needs-human` label so agents do not pick it up.

## Increment

An increment is an outcome-bearing slice of a mission: usually one branch, one
review batch, and one validation point. In Atelier it is a parent issue, any
work item with direct children, one level deep. Children work on the parent's
branch, and the parent closes after them. Use labels, not parents, for themes.

A parent uses the Issue template with these meanings:

- **Goal:** what is true when the increment is done, observably.
- **Done when:** how the outcome will be shown (author proof plus review, or
  a linked validation item) and which mission success criteria it delivers,
  by number, e.g. S1, S3.
- **Unknowns:** what must be learned before or during the increment.
- **Background:** context every child shares, so children need not repeat it.

Plan later increments in the `backlog` status with a preliminary Goal, a
provisional Done when (required even in backlog), and their Unknowns. Before
planning one into `todo`, make its Done when concrete and add its immediate
children and dependencies as native links.

## Validation Item

Create one when an independent `validate` assignment is needed, such as for
mission acceptance or an increment that changes a user-facing outcome. It uses the
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

## Decision

A choice that is waiting on the human is a `decision` record:

```md
## Question
<The choice to make, and why it matters now.>

## Options
<The credible options and their tradeoffs. Omit if not yet known.>

## Decision
<What was decided, why, and on whose authority. Filled in when deciding.>
```

Context and Background are optional. Open decisions are the human's by
default and never appear as agent-ready work. A decision that outlasts the
mission also goes in the owning doc or an ADR (see
[`decide`](../procedures/decide.md#authority-and-recording)).

## Evidence

Record evidence in the tracker when later work or a later agent will rely on
it: increment or mission acceptance, independent validation, migrations, and
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
someone explicitly makes it one. Create it with
`atelier issue create --discovered-from <finding, item or receipt id>` so the
debrief can place it.
