# Tracker Records

Use this reference when creating or updating missions, epics, issues,
validation items, and tracker comments. It defines what each record contains,
not tracker commands; see [Managing Issues](tracker-commands/managing-issues.md)
for those. Repository conventions come first where they differ.

## Principles

- **Each fact lives in one place.** The strategy owns intent, the tracker owns
  status and sequencing, and docs own design. Link to the owner instead of
  copying. Copies drift, and then agents cannot tell which one is true.
- **Records are short.** A reader should see what the item is for, and what
  done means, in seconds. Leave out any section that would say nothing.
- **Status lives in state, not prose.** Use the tracker's open, closed, and
  label or field state, plus dated comments. Do not keep status tables in
  issue bodies or docs.
- **Link, don't version.** Point to the strategy file, docs, and other issues
  by path or link, not by revision number.

With no tracker, keep the same records as sections of a plan file, with a
status line on each.

## Mission

The mission body is a front door. It does not restate the strategy.

```md
- **Strategy:** <path to strategy file>
- **Deliberation:** <link to planning artifact, if any>

<One paragraph: the outcome, in plain words.>

## Epics
<Native sub-issues, or a list of links. No status tables.>
```

If there is no separate strategy file, the mission body is the strategy.
Use the [strategy template](strategic-plans.md#template) directly.

Post progress as comments. At meaningful points, post a dated status comment
listing the success criteria shown so far, current epics, blockers, and open
questions.

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
fill in Proof, and add its immediate child issues and dependencies using the
tracker's native links.

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

## Depends on
<Linked issues. Omit when none.>
```

Use the tracker's native dependency links when it has them, and omit the
section. Put follow-up findings in new issues, not in the body of a closed
one.

## Validation Item

Create one when an independent `validate` assignment is needed, such as for
mission acceptance or an epic that changes a user-facing outcome.

```md
## Claims
<The success criteria or acceptance claims under test, by reference.>

## Method
<How each will be checked, and in what environment.>

## Results
<Filled in by the validator: each claim, its result, and a link to its
evidence comment. The evidence comments hold the detail.>
```

## Comments

**Evidence** (see [Evidence Tracking](tracker-commands/evidence-tracking.md)):

```md
**Evidence** for <claim or issue>
Check: <command, scenario, or measurement>
Result: <pass | fail | blocked | not-applicable>: <one line>
Artifacts: <links to CI runs, logs, screenshots, commits>
```

**Handoff:** the standard [handoff](../SKILL.md#handoff), posted when an
assignment ends.

**Finding dispositions:** the short form in
[Finding Disposition](finding-disposition.md#recording).

## Deferred Follow-Up

A normal issue using the Issue template. The Goal says what was found, and the
Context links to the finding that produced it. It is not a blocker unless
someone explicitly makes it one.
