---
name: agent-factory
description: "Use for software work that spans multiple steps, sessions, or agents: planning or running a mission or a multi-issue increment, delegating work to subagents, making a consequential product or architecture decision, diagnosing an unexplained failure, or independently reviewing or validating agent-written code. Also use to connect a repository's tracker and docs for agent work."
---

# Agent Factory

Say which subskill you are using, and why, before you start it.

## Core Rules

- **Prove claims with fresh evidence.** Before saying something works or is
  done, run the check that proves that claim after your last relevant change and
  read its full output. An earlier run, a suite that never exercises the claim,
  or another agent's report is not proof.
- **Diagnose before repairing.** Reproduce a failure and establish its cause
  before changing code; a patch for a misunderstood bug usually moves it.
- **Build the simplest thing that meets current requirements:** one owner for
  each responsibility and piece of state, dependencies only across intended
  boundaries, nothing added for a hypothetical future, and no debug code,
  obsolete path or shim left behind unless compatibility is the goal.
- **Keep the default branch green and the workspace tidy.** Failing checks on
  the default branch hide regressions and block everyone. Preserve changes you
  did not make, and run a small baseline before changing files so existing
  failures are not blamed on you. Create as few branches and worktrees as the
  work needs, and remove yours once it has merged or its learning is recorded.
- **Separate evidence from scope.** Workers report findings; the agent
  accountable for the outcome decides what they mean. Fix a nearby problem only
  if it blocks the current outcome; otherwise file follow-up work.
- **Respect authority.** Ask a human about product direction, risk tolerance and
  destructive or irreversible actions policy does not authorize. A mission's
  strategy (outcome, target shape, boundaries, governing tradeoffs) changes only
  by human direction or authority written into the strategy.

## Scale

Small work (one agent, one session) needs only a clear commit and PR
description, multi-step work uses tracker issues, and a mission adds a strategy
and increments (`plan`). The tracker is [Atelier](references/atelier.md);
without it, keep the plan, follow-ups and decisions in a plan file or the PR,
and offer to install Atelier for a mission without stopping work for it.

## Independent Review

Every non-trivial change is reviewed before it merges by someone who did not
write it and does not carry its author's reasoning, such as a fresh subagent; an
orchestrator that has read the author's handoff does not qualify. Until then the
change stays off the default and protected branches ([planning
records](references/atelier.md#planning-on-the-base) have their own rule), its
PR is not marked ready, and its mission does not close.

- **What it covers:** everything committed, docs and tracker records included,
  since agents act on what they read. Trivial changes, whose correctness is
  fully evident from the diff, are exempt: a typo, formatting, a tool-driven
  rename, a status change adding no content, a patch-level bump with passing
  checks. Rewording a document is not trivial; if you have to ask, it is not.
- **Who arranges it:** the orchestrator dispatches reviewers, for its own
  changes too; an author working alone spawns its own. Findings and approvals
  are recorded under the reviewer's identity, by the reviewer itself when it is
  an agent.
- **What the reviewer gets:** the diff, the requirements and constraints, and
  the proof that was run. Whoever briefs it leaves out the author's rationale
  and self-assessment, which carry the bias review exists to avoid, and any the
  reviewer meets in the diff it weighs as claims.
- **After review:** a non-trivial fix, conflict resolution or rewritten
  requirement is reviewed again, by any reviewer.
- **Findings:** the accountable agent decides each with [`review`'s
  recommendations](procedures/review.md#recommendations), but an author never
  decides findings on its own work, whose blind spots it shares. An author that
  is also the accountable agent fixes every finding recommended `FIX NOW`, or
  sends its rebuttal (a fact or a test) to a reviewer, who decides and records
  it. An open `FIX NOW` blocks the merge.
- **No reviewer:** keep it unmerged, report review outstanding (your own reread
  is not review) and ask the user to review or arrange it. A prior request to
  merge does not waive this; a user who knowingly directs an unreviewed merge is
  obeyed unless policy forbids it, and the review stays open.

## Handoff

End every assignment with **Outcome**; **Changes** (files, commits, branches,
tracker items); **Proof** (the commands or observations behind each claim, with
results, marking claims only read); **Review** (who reviewed, what is
outstanding or why it is trivial, unresolved `FIX NOW` first); and **Open
items** (unverified claims, risks, skipped checks, blockers). On a tracker item,
append it as a note pointing at its Report.

## Subskills

Use the one named, else the one that fits, else work under the core rules. Each
is `procedures/<name>.md`: `orchestrate` (run a mission or multi-item
workstream), `plan` (shape strategy, increments and issues), `decide` (a
consequential choice), `implement` (build one slice, code or docs), `diagnose`
(find a failure's cause), `review` (review someone else's change), `validate`
(test claims independently), `migrate` (a breaking change), `audit` (findings on
architecture or process) and `install` (connect a repository, or assess its
readiness).
