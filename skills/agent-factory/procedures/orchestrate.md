# Orchestrate

Use this subskill to run a mission, an increment or any workstream with several
pieces. You are accountable for the outcome: you decide what happens next,
delegate or do the work, integrate results, keep the plan current and close a
mission against demonstrated outcomes.

## Before Starting

Know the outcome and what governs it: the strategy for a mission, or the issue
or request for smaller work. If a substantial mission has no agreed outcome or
strategy, run `plan` first. Then keep going through ready work without asking
between steps. Stop and ask only at an authority boundary, an ambiguity that
would change the result, a current hazard, or a blocker you cannot resolve
within the strategy.

## Delegate or Do It Yourself

Delegation costs a handoff and loses detail, so do small work yourself when you
already hold the context. Delegate when slices can run in parallel, when a task
would flood your context with material you will not need again, when it needs a
different model, or when it must be independent of you, as review and validation
of your own work must be.

## Assignments

An assignee sees only what you give it and what it can find in the repository.
Give it:

- **Goal and why:** the outcome, why it matters and how it fits.
- **Subskill:** exactly one.
- **Context:** tracker IDs, docs, decisions and constraints, and what has been
  learned that it cannot discover alone; point to large artifacts by path or ID
  instead of pasting them.
- **Scope:** what it may change and what it must leave alone.
- **Workspace:** the branch you create or choose (with Atelier, start the item
  on it), and a worktree only if it must write while another agent does.
  Read-only roles get neither: they read with `git diff`, `show` and `log`, or
  use the author's checkout while it is idle. It lists what it creates.
- **Proof expected:** the observable result that would show the goal is met.
- **Handoff:** anything you need beyond the standard handoff.

Start subagents with fresh context, not your conversation. Choose the cheapest
model and effort likely to make the whole workflow succeed, counting retries
and the cost of a mistake; a long chain of reasoning, not a label like
"security", calls for a stronger one.

Give a spike or competing candidate its purpose, its question and what it may
see of other attempts; run competitors against the same requirements and proof,
each on its own disposable branch.

One branch serves one pull request, sized for review: usually an increment, not
an issue. Review fixes and retries are commits on that branch. Atelier merges
only into its base, so with Atelier do not stack one owner's branch on another's
or plan an integration or rewrite branch: sequence the work, or put the slices
under one parent so they share a branch, and ask the human if the work truly
needs another arrangement.

## Review and Validation

Brief reviewers as [Independent Review](../SKILL.md#independent-review) says,
batching per slice, PR or increment so each diff stays reviewable, and tell them
to report in [`review`](review.md#output)'s format. Do not pre-judge their work:
do not tell them to ignore a class of findings, limit their recommendations, or
treat any content as beyond challenge, and if two requirements conflict, hand
over both.

Read the findings and the verdict in full and decide each with [`review`'s
recommendations](review.md#recommendations), except on your own work, where
Independent Review's Findings rule applies. You decide scope; you do not redo
the review. If a fact you need is missing or disputed, ask one focused question
of the reviewer, the author or a `diagnose` worker instead of re-reading the
subsystem yourself.

The reviewer's recommendation is your default, since it weighed the finding
against the change. Fix trivial issues. For larger ones, decide based on how
much they grow the change. Defer with `atelier review defer <id>`. One rule
overrides the reviewer: a new finding on the fix of a low-severity finding is
deferred unless it shows a regression that fix introduced. You record that
defer, or a reviewer does if you wrote the fix.

**Stop signals.** When work starts, write its estimate (lines or files changed)
in the assignment or a decision note. A fix past about twice its estimate, a fix
drawing findings on its own changes, or a third review round each says the work
costs more than planned, and pushing on is how an easy fix grows to hundreds of
lines. Stop and choose: merge as is (deciding what is left as review
recommends), shrink to the part worth having, or discard, declining the item
with what it taught in its Report. Record the choice and why as a decision note.

## Integrating Results

A returned implementation is a candidate until you have verified that its proof
is fresh and exercises the claim and that it fits the strategy. Passing tests
show behavior, not construction, so judge a candidate's behavior, design and
learning separately. Integrate it when behavior and design are both sound;
otherwise refactor it, reimplement it with its tests and findings but not its
code, or discard it, recording what it taught. Passing tests and effort already
spent are not reasons to keep code. If candidates expose conflicting
requirements or a strategic question, escalate instead of picking a side.

## Keeping the Plan Current

The plan is a hypothesis. After each integrated increment, material discovery,
failed assumption or new blocker, revise the smallest layer that absorbs the
evidence: clarify, retry or reassign an assignment; revise issues, dependencies,
sequencing or proof within the strategy; or, for a strategy problem, pause the
affected work, continue independent work and route the question through `decide`
and `plan`. A current hazard stops the harmful work first.

Plan the next backlog increment when its predecessor's evidence arrives or ready
work runs low. If ready work runs out, find whether you lack detail, evidence or
a decision; do not invent busywork. Do not plan in detail or send for review an
item that depends on an open human decision until it is decided, since the
decision may change or remove it. When superseding plans, keep completed work
and failed evidence, and do not rewrite history to make the new route look
inevitable. Post progress on the mission as dated notes.

Batch low-priority follow-ups as children of one parent, as `review defer` does
for an item's deferred findings: each is started on the parent's branch with its
own Done when, and one review and one merge of the parent cover them all.

## Closing a Mission

A mission closes when all its work is merged and its validation items are done,
judged by demonstrated outcomes, not issue count:

1. Run the proof for each acceptance claim fresh, through a validator where a
   validation item calls for one.
2. Confirm every loose end is filed.
3. Clean up what the work created, starting from handoffs and records and
   comparing with `git worktree list` and `git branch --list`. Tag an unmerged
   branch `archive/<branch>` before deleting it, and ask before deleting
   anything you cannot trace to this work, anything with uncommitted changes, or
   a branch with an open PR; remote branches follow repository policy.
4. Close it with `atelier issue transition <mission> close --reason "<report>"`,
   then walk the human through `atelier debrief <mission> --html` and record
   their direction as review records, decisions, notes and issues.

In the handoff, also report delivered and deferred outcomes, open loose ends,
plan changes, paused questions, and each branch or worktree created, with
whether it was removed, archived or kept and why.
