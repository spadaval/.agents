# Tracker Records

Use this reference when creating or updating missions, increments, issues,
loose ends, validation items, decisions, evidence, and handoff notes. It defines what each
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
the whole that the mission's work can make true and verify at close (see
[Shaping a Mission](../procedures/plan.md#shaping-a-mission)). Omit the
section when there are none.>

## Background
<Research, references, and motivation the mission's work shares. Omit when
none.>
```

Atelier accepts only these sections in a mission body, plus the shared Notes
and Report. If there is no separate strategy file, Outcome and any
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
<One `- [ ]` line per observable proof: a test, command or scenario that
could fail if the work were wrong or missing. Every line holds, and is
ticked, before review is requested.>

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
Put follow-up findings in new issues, not in the body of a done one. Mark
work only a human can do, such as an account approval or a step at a
particular machine, with the `needs-human` label so agents do not pick it up.

Work that changes no code and can only happen after the merge is a
[loose end](#loose-end), not a Done when line. Decide that when you plan the item.

### Report

The author writes the `## Report` once every Done when line holds, before
asking for review. Its first paragraph is the Outcome: one or two sentences
giving the observable result against Done when. After it, name the targeted
test that proves each claim, with its result. The review brief leaves the
Report out, since it is the author's self-assessment; the human reads it in
the mission's debrief, so its other parts say what the diff and the proof do
not show. A `supersede`, a mission's `close` and a decision's `decide` write
their reason in the same section.

```md
## Report

<Outcome.>

### Deviations
<Where the work departed from the issue or plan, and why.>

### Decisions
<The choices that shaped the work; point at the item's decision notes or
records rather than repeating them.>

### Surprises
<What you did not expect: a wrong assumption, a hidden constraint, a cost.>

### Open items
<What is left: follow-ups and loose ends with their issue IDs, unverified
claims, risks, skipped tests with reasons, and blockers.>
```

Leave out a part that would be empty. Measurements and review status go in
evidence receipts, review records, or the handoff note. Be candid and short:
the human reads these across a whole mission.

## Increment

An increment is an outcome-bearing slice of a mission: usually one branch, one
review batch, and one validation point. In Atelier it is a parent issue, any
work item with direct children, one level deep. Children work on the parent's
branch, and the merge of that branch marks the parent and its open children
done. Use labels, not parents, for themes.

A parent uses the Issue template with these meanings:

- **Goal:** what is true once the increment merges, observably.
- **Done when:** the author's proof of the outcome, ticked before review
  like any line, and which mission success criteria, if any, it delivers, by
  slug, e.g. `pipe-safe`. Independent validation is a linked validation item,
  not a line.
- **Unknowns:** what must be learned before or during the increment.
- **Background:** context every child shares, so children need not repeat it.

Plan later increments in the `backlog` status with a preliminary Goal, a
provisional Done when (required even in backlog), and their Unknowns. Before
planning one into `todo`, make its Done when concrete and add its immediate
children and dependencies as native links.

## Loose End

A `loose_end` issue holds work that changes no code and can only happen
after a merge or a release; [Atelier](atelier.md#loose-ends) says when to
file one and how it is done. Its Goal says what to do after which item
merges and why it cannot happen before, and its Done when is the one
observation that shows it worked. Label it `needs-human` when only the human
can do it.

## Validation Item

Create one when an independent `validate` assignment is needed, such as for
mission acceptance or an increment that changes a user-facing outcome. It
uses the `validation` issue type, advances its mission, and, like a loose
end, is done on the base with no branch or review of its own:

```md
## Goal
Validate <referenced mission criteria or acceptance claims> independently.

## Done when
- [ ] Each claim has an explicit result and linked evidence receipt; the
  Report states failures, blocked claims, and proof limits.

## Scope
<Artifacts the validator may produce outside the repository; a test worth
keeping goes through a branch. Omit when unnecessary.>

## Context
<Links to the claims, the method and environment, and relevant design.>
```

Results live in evidence receipts, one per claim, attached to the validation
item, and its Report summarizes them when it is marked done. Do not rewrite
acceptance intent to store results.

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
decision record holds the question and the decision, and docs link to it
instead of restating its rationale. Where the repository keeps ADRs, a
decision record may also produce one, a document such as `docs/adr/<n>.md`
written for readers of the code; the record names it with `atelier issue
update <id> --adr <path>`. A changed decision gets a new record linked to
the old one with `atelier issue link <new> <old> --role supersedes`; a decided record cannot
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

A choice that meets the record test in [Decision](#decision), such as one
that is costly to reverse, is a decision record, not a note. `atelier work
decisions <mission>` lists notes and records together.

## Evidence

A receipt is optional, for proof that leaves no other record (see
[Atelier](atelier.md#evidence)), such as a page at phone width, a real build
host or a live service. It states the claim, how it was observed, the
result, the commit, and links to transcripts or artifacts. Use this
vocabulary verbatim so evidence stays searchable:

- Claim results: `pass`, `fail`, `blocked`, `not-applicable`.
- Cause of a failure: `defect in this change`, `expected breakage`,
  `environment/tooling`, `pre-existing`. `expected breakage` applies only on
  an isolated rewrite branch declared in the plan, never on the default
  branch.
- Finding recommendations: `FIX NOW`, `DEFER`, `NO ACTION` (`fix_now`,
  `defer`, `no_action` on the command line). A finding recommended and fixed
  as `FIX NOW` records no disposition; any other records one.

## Notes and Reviews

**Handoff:** the standard [handoff](../SKILL.md#handoff), appended as a dated
note when an assignment ends. When the item has a Report, the outcome and
open items live there and decisions in their notes or records, and the note
points at them and holds the remaining handoff fields: changes, proof, review
status, and any a subskill adds.

**Reviews and finding dispositions:** review records, not notes. See
[Finding Disposition](finding-disposition.md#recording).

## Deferred Follow-Up

A normal issue using the Issue template. The Goal says what was found, and the
Context links to the finding that produced it. It is not a blocker unless
someone explicitly makes it one. Create it with
`atelier issue create --discovered-from <finding, item or receipt id>` so the
debrief can place it.
