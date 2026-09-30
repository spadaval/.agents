# Orchestrate

Use this subskill to run a mission, epic, or any workstream with several
pieces. The orchestrator is accountable for the outcome. It decides what
happens next, delegates or does the work, integrates results, keeps the plan
current, and closes against demonstrated outcomes.

## Before Starting

Know the outcome you are driving toward and what governs it: the strategic
plan for a mission, or the issue or user request for smaller work. Check the
workspace state and a representative baseline before any mutating work (see
[Workspace Lifecycle](../references/workspace-lifecycle.md)). If a substantial
mission has no agreed outcome or strategy, run `plan` first.

Keep going through ready work without asking permission between steps. Stop
and ask only when you reach a real authority boundary, an ambiguity that would
change the result, a concrete current hazard, or a blocker you cannot resolve
within the strategy.

## Delegate or Do It Yourself

Delegation costs a context handoff and loses detail. Do the work yourself when
you already hold the context and the task is small. Delegate when:

- slices can run in parallel;
- a task would flood your context with material you will not need again;
- the work needs a different model or reasoning level; or
- the work must be independent of you, as review and validation of code you
  wrote must be.

Code you write yourself follows the same review rule as any other author's.

## Assignments

A delegated assignment is self-contained. The assignee sees only what you give
it and what it can pull from the repository. Include:

- **Goal and why:** the outcome, the reason it matters, and how it fits the
  larger work. Assignees make better judgment calls when they know the intent.
- **Subskill:** exactly one, such as `implement`, `diagnose`, or `review`.
- **Context:** tracker IDs, relevant docs, ADRs, and constraints, and what has
  been learned so far that the assignee cannot discover alone. Point to large
  artifacts by path or ID instead of pasting them.
- **Scope:** what it may change, and what it must leave alone.
- **Workspace:** where to work (branch or worktree). Tell it to preserve
  changes it did not make, especially when agents run in parallel.
- **Proof expected:** the observable result that would show the goal is met.
- **Handoff:** anything beyond the standard handoff you need back.

Set the model and reasoning effort when the runtime allows it (see
[Submodel Selection](../references/submodel-selection.md)). Start subagents
with fresh context unless essential context cannot be summarized.

For spikes or competing implementations, add the candidate fields from
[Implementation Candidates](../references/implementation-candidates.md).

## Review and Validation

You arrange review. Every non-trivial code change, including code you wrote
yourself, gets an independent reviewer before it counts as done (see
[Independent Review](../SKILL.md#independent-review)). Batch reviews per
slice, per PR, or per increment, whichever keeps the diff reviewable. You have
read the author's handoff, so you are not an independent reviewer of its code.

When dispatching a reviewer or validator:

- Give it the diff or scenario, the governing requirements and constraints
  quoted exactly, and the proof that was run.
- Do not pass along the author's rationale or self-assessment.
- Do not pre-judge its work: do not tell it to ignore a class of findings, cap
  severity, or treat any content as beyond challenge. If two requirements
  conflict, hand over both and let the reviewer report the conflict.

When findings come back, read them in full and decide each one with
[Finding Disposition](../references/finding-disposition.md). You decide scope;
you do not need to redo the review. For findings on code you wrote yourself,
you are not a neutral judge: fix recommended `FIX NOW` findings or send your
rebuttal back to a reviewer. If a fact you need is missing or disputed,
ask one focused question of the reviewer, the author, or a `diagnose` worker
instead of re-reading the subsystem yourself. Record decisions where the work
is tracked.

Use an independent `validate` assignment for mission acceptance, for epics
that change a user-facing or cross-boundary outcome, and for scenarios where
deciding what to check needs an independent eye. Otherwise, author-run proof
is sufficient evidence of behavior.

## Integrating Results

Treat a returned implementation as a candidate until you have checked it.
Passing tests show behavior, not construction quality. Before integrating,
confirm the proof is fresh and exercises the claim and that the change fits
the strategy. Unreviewed code may be integrated into a working or mission
branch while its review is pending, but it does not reach the default or
protected branch until review is done. When a candidate works but is
built wrong, decide whether to refactor, reimplement, or discard it using
[Implementation Candidates](../references/implementation-candidates.md).

## Keeping the Plan Current

The plan, whether an issue graph or a plan file, is a hypothesis. Revise it after each integrated increment,
material discovery, failed assumption, or new blocker. Change the smallest
layer that absorbs the new evidence:

| Change | Action |
| --- | --- |
| Assignment problem | Clarify, retry, or reassign the same work. |
| Plan problem | Revise issues, dependencies, sequencing, or proof within the strategy. |
| Strategy problem | Pause the affected work, continue independent work, and route the question through `decide` and `plan`. |
| Current hazard | Stop the harmful work first, then replan at the right layer. |

A change is strategic when it alters the outcome, the target system shape, a
governing tradeoff, a boundary, or an accepted ADR. Those need the authority
described in the [Constitution](../constitution.md#strategy-changes-deliberately).

Plan executable work only as far as current evidence supports. Keep later work
as draft epics with a preliminary outcome and known unknowns, and expand the
next one when its predecessor's evidence arrives or ready work runs low. If
ready work runs out, figure out whether you are missing detail, evidence, or a
decision. Do not invent busywork.

When a worker finds a nearby bug, fix it in the current change only if it
blocks the current outcome. Otherwise record it as follow-up work. Preserve
completed work and failed evidence when superseding plans; do not rewrite
history to make the new route look inevitable.

## Closeout

Close against demonstrated outcomes, not issue count:

1. Run the proof for each acceptance claim fresh, with independent validation
   where the scaling rules call for it.
2. Confirm all non-trivial code has been independently reviewed.
3. Confirm no debug residue, temporary breakage, or orphaned paths remain.
4. Update the docs and tracker items or plan file the work affected.

In the handoff, also report delivered and deferred outcomes, plan changes,
paused questions, and workspace state.
