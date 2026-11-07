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
<Optional, and only when there is no strategy file; otherwise the strategy
owns them. One `- <slug>: <claim>` bullet per criterion, each a claim about
the whole that the mission's work can make true and check at close (see
[Shaping a Mission](../procedures/plan.md#shaping-a-mission)). Omit the
section when there are none.>

## Background
<Research, references, and motivation the mission's work shares. Omit when
none.>
```

Atelier accepts only these sections in a mission body, plus the shared Notes
and Close Reason. If there is no separate strategy file, Outcome and any
Success criteria carry the strategy. When the mission needs more of the
[strategy template](strategic-plans.md#template), such as Shape, Scope, or
Authority, write a strategy file and link it; do not add those sections to
the mission. Work joins the mission through `advances` links; missions are
never parents.

Post progress as dated notes. At meaningful points, note what is done
against the outcome, any success criteria shown so far, current increments,
blockers, and open questions.

## Issue

An issue is one executable slice. A worker without your context should be
able to do it from the body alone. It is typically 10 to 30 lines.

```md
## Goal
<What to change and why it matters. One short paragraph.>

## Done when
<The observable proof: a test, command, check, or scenario that could fail
if the work were wrong or missing. Each line is checked before merge unless
it is an [after-merge check](#after-merge-checks).>

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

### After-Merge Checks

Validate everything you can before the merge. Post-merge validation is only
what cannot be checked before it: a check that needs the deployed or merged
system, a device or place no agent can reach, the human's judgment, or time
and real use. Mark such a line of Done when with its reason and its nearest
stand-in, which still runs before merge (an emulator for a device, a test
server for production); the after-merge check covers only the gap between
the two:

```md
- [ ] After merge (device): the launcher opens on Sumeet's phone. Stand-in: the emulator test `launch_opens` passes.
```

Decide the split when you plan the item. Moving a check to after merge once
the item has started is a plan change that the reviewer sees.

The item closes and merges as usual. Validate on the base as a planning
change, with no reviewer identity: run the check, record its receipt, tick
the box (`- [x] After merge ...`) and commit the record. If it fails, do not
reopen the merged item: file a follow-up bug with `atelier issue create
--discovered-from <item>`, and add `carried to <bug>` to the line, so the bug
holds the check from then on. Validate every check that can be validated
now. Carry a check only when it failed, to its follow-up bug, or when it
needs time and real use beyond the mission, and name each carried check in
the mission's close report so the human sees it. Atelier shows done work
with an open after-merge check as awaiting validation and warns when its
mission closes, but nothing refuses.

### Close Reason and the Implementer Report

Close Reason is written when the item closes. Its first paragraph is the
Outcome: one or two sentences giving the observable result against Done
when, or for `supersede` why the work will not happen. After it, name the
targeted test or check that proves each claim, with its result.
Measurements and review status go in evidence receipts, review records, or
the handoff note.

Close Reason also carries the implementer report: what a reviewer of the
finished mission needs that the diff and the proof do not show. Repository
policy may require particular parts.

```md
## Close Reason

<Outcome.>

### Deviations
<Where the work departed from the issue or plan, and why. `None.` if none.>

### Decisions
<The choices that shaped the work; point at the item's decision notes or
records rather than repeating them. `None.` if none.>

### Surprises
<What you did not expect: a wrong assumption, a hidden constraint, a cost.
`None.` if none.>

### Open items
<What is left: follow-ups with their issue IDs, plus unverified claims,
risks, skipped checks with reasons, blockers, and the item's open
[after-merge checks](#after-merge-checks), each with its reason and the
stand-in that ran. `None.` if none.>
```

Write it in the record body, or in a file passed with `--reason-file`, then
run the close transition. Close before requesting the final review, so the
reviewer sees the done claim and the report. Be
candid and short: a reviewer reads these across a whole mission.

## Increment

An increment is an outcome-bearing slice of a mission: usually one branch, one
review batch, and one validation point. In Atelier it is a parent issue, any
work item with direct children, one level deep. Children work on the parent's
branch, and the parent closes after them. Use labels, not parents, for themes.

A parent uses the Issue template with these meanings:

- **Goal:** what is true when the increment is done, observably.
- **Done when:** how the outcome will be shown (author proof plus review, or
  a linked validation item) and which mission success criteria, if any, it
  delivers, by slug, e.g. `pipe-safe`.
- **Unknowns:** what must be learned before or during the increment.
- **Background:** context every child shares, so children need not repeat it.

Plan later increments in the `backlog` status with a preliminary Goal, a
provisional Done when (required even in backlog), and their Unknowns. Before
planning one into `todo`, make its Done when concrete and add its immediate
children and dependencies as native links.

## Validation Item

Create one when an independent `validate` assignment is needed, such as for
mission acceptance or an increment that changes a user-facing outcome. A
check of one item that can only run after its merge is an
[after-merge check](#after-merge-checks) on that item, not a validation item.
It uses the
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

A choice is a `decision` record when it is costly to reverse, reaches
beyond the item it was made in, changes a public or persisted contract, or
needs the human. That holds whether it is waiting on the human or was made
within an agent's authority. Other choices made inside one work item are
[decision notes](#decision-notes), even when they are non-obvious or reject
an alternative.

```md
## Question
<The choice to make, and why it matters now.>

## Options
<The credible options and their tradeoffs. Omit if not yet known.>

## Decision
<What was decided, why, on whose authority, and its consequences. Filled in
when deciding.>
```

Context and Background are optional. Open decisions are the human's by
default and never appear as agent-ready work. In an Atelier repository the
decision record is the ADR: docs link to it instead of restating its
rationale. A changed decision gets a new record linked to the old one with
`atelier issue link <new> <old> --role supersedes`; a decided record cannot
take the `supersede` transition (see
[`decide`](../procedures/decide.md#authority-and-recording)).

### Decision Notes

A choice an implementer makes inside one work item, within its authority, is
a decision note on that item. Write one when a later reader would otherwise
ask "why is it like this?": a design choice between credible options, a
deliberate departure from the plan, or a tradeoff. Keep it short; a two-line
note that gets written beats a full one that is skipped.

```text
atelier issue note <id> --kind decision "<the choice>" --reason "<why>" \
  [--rejected "<alternative>"]...
```

A choice that meets the record test in [Decision](#decision) is a decision
record, not a note. Do not use `issue note --one-way`: a choice that is
costly to reverse is a record. `atelier work decisions <mission>` lists notes
and records together.

## Evidence

Record a receipt only for a check that leaves no other record: a manual,
browser, device or deployed check (a page at phone width, a real build host,
a live service), a mission criterion, independent validation, a measurement,
or a failure, including a test that fails before its fix. Suites, fmt and
lint that CI or the repository's merge checks run need no receipt, and
nothing is re-recorded after a review fix or a base merge; the Close Reason
names the targeted test or check that proves each claim. Record one anyway
when the repository's merge policy requires a receipt.

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
note when an assignment ends. When the assignment closes the item, the
outcome and open items live in the Close Reason and decisions in their notes
or records, and the note
points at it and holds the remaining handoff fields: changes, proof, review
status, and any a subskill adds.

**Reviews and finding dispositions:** review records, not notes: each
finding's disposition is a field of the finding's record. See
[Finding Disposition](finding-disposition.md#recording).

## Deferred Follow-Up

A normal issue using the Issue template. The Goal says what was found, and the
Context links to the finding that produced it. It is not a blocker unless
someone explicitly makes it one. Create it with
`atelier issue create --discovered-from <finding, item or receipt id>` so the
debrief can place it.
