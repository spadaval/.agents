---
name: agent-factory
description: "Use for software work that spans multiple steps, sessions, or agents: planning or running a mission or epic, delegating work to subagents, making a consequential product or architecture decision, diagnosing an unexplained failure, or independently reviewing or validating agent-written code. Also use to connect a repository's tracker and docs for agent work."
---

# Agent Factory

Agent Factory coordinates AI agents so their output is correct, well built,
and able to be continued by someone else. It divides work into bounded roles,
keeps important state in durable artifacts, and relies on fresh evidence and
independent review instead of an agent's confidence in its own work.

The [Constitution](constitution.md) states the intent behind every rule here.
When the guidance is silent, conflicts, or clearly does not fit the situation,
reason from the Constitution.

## Core Rules

- **Prove claims with fresh evidence.** Before saying something works, is
  fixed, or is done, run the check that proves that specific claim after your
  last relevant change, and read its full output. A green suite that never
  exercises the claim, an earlier run, or another agent's report is not proof.
- **Get non-trivial code reviewed by someone other than its author.** Authors
  verify their own work by running it, but they do not review it. See
  [Independent Review](#independent-review).
- **Diagnose before repairing.** When the cause of a failure is unknown,
  reproduce it and establish the cause before changing code. A plausible patch
  for a misunderstood bug usually moves the bug.
- **Build the simplest thing that meets current requirements.** Every new
  component, abstraction, option, or fallback must serve a current need. Remove
  temporary code, obsolete paths, and shims unless compatibility is the
  explicit goal.
- **Keep state where the next agent can find it.** How much you write down
  should depend on how likely the work is to be resumed or handed off (see
  [Scaling](#scaling-the-process)).
- **Separate evidence from scope.** Workers report findings; the agent
  accountable for the outcome decides what they mean for current work.
- **Respect authority.** Ask a human about product direction, risk tolerance,
  and destructive or irreversible actions that repository policy does not
  already authorize. Strategy changes only by human direction or authority
  written into the strategy.

State which subskill you are using and why before starting it.

## Scaling the Process

Match ceremony to the work. These tiers are guides, not gates. Move up a tier
when handoffs, duration, or risk grow.

| Work | Planning | State and handoff | Review and validation |
| --- | --- | --- | --- |
| **Small**: one agent, one session, a contained change | Think it through; no plan artifact needed | Clear commit message and PR description | Self-verify by running it; one independent reviewer for non-trivial code |
| **Multi-step**: several slices, sessions, or agents | Tracker issues, or a short plan file when there is no tracker | Tracker items or the plan file carry scope, proof, and handoffs | Independent review per slice or per PR |
| **Mission**: multi-epic, long-running, or cross-system | Written [strategic plan](references/strategic-plans.md), epics, issues planned just in time | Tracker is the source of truth; decisions in docs or ADRs | Independent review of all non-trivial code; independent `validate` for mission acceptance and for epics that change a user-facing or cross-boundary outcome |

If the repository has no tracker, or you cannot use it, keep the plan and any
follow-up items in a file in the repository or in the PR description. Do not
stop work to set a tracker up unless the user asks. Wherever this skill says
"create an issue", that fallback applies.

## Independent Review

Every non-trivial code change is reviewed by someone other than its author
before it is considered done. That reviewer can be another agent or a human
who did not write it. Review may be batched per slice, per PR, or per
integrated increment. Unreviewed code may sit on a working branch, but it does
not merge into the repository's default or protected branch, a PR is not
marked ready, and a mission does not close until review has happened.

- **What counts as code:** anything that changes behavior when executed or
  deployed. That includes application code, tests, configuration, schemas and
  data migrations, build and CI definitions, infrastructure, and agent prompts
  or skills. Prose-only documentation is not code.
- **Trivial changes are exempt:** changes whose correctness is fully evident
  from the diff. Examples are typo fixes, formatting, tool-driven renames,
  comments, prose wording, and patch-level dependency bumps with passing
  checks. Wording changes to prompts or skills are not trivial, because they
  change behavior. If you have to think about whether a change is trivial,
  it is not.
- **Who reviews:** someone who did not write the code and does not carry the
  author's reasoning. A fresh subagent qualifies. A different model is a
  bonus, not a requirement. An orchestrator that has read the author's
  handoff or rationale does not count as independent. Code the orchestrator
  writes itself needs review like anyone else's.
- **Who arranges it:** under an orchestrator, the orchestrator dispatches
  reviewers and the author reports its review status. An author working alone
  spawns its own reviewer.
- **What the reviewer gets:** the diff, the requirements and constraints, and
  the proof that was run. Do not give it the author's justifications or
  self-assessment; they carry the bias the review exists to avoid.
- **Changes after review:** any non-trivial change made after review, whether
  a fix to a finding, a new commit, or a conflict resolution, gets reviewed
  too. The reviewer does not have to be the same one.
- **Disagreement:** an author who disputes a finding answers with a code fact
  or a test, never with confidence, schedule, or severity. The accountable
  agent decides using [Finding Disposition](references/finding-disposition.md).
  An author who is also the accountable agent, whether working alone or as an
  orchestrator that wrote the code, is not a neutral judge of its own
  rebuttal. It either fixes every finding the reviewer recommended as
  `FIX NOW`, or sends its rebuttal back to a reviewer. Any recommended
  `FIX NOW` left unresolved goes at the top of the handoff, and the work is
  not done.
- **If no reviewer is available:** leave the change unmerged (on a branch, as
  a draft PR, or as uncommitted edits), mark review as outstanding in the
  handoff, and tell the user plainly. Ask them to review it or arrange review.
  An earlier instruction to merge does not waive review. If the user, knowing
  the change is unreviewed, still directs a merge, comply and record the
  review as an open follow-up so it still happens. Never describe self-review
  as review.

Validation is different. Running tests and scenarios is impartial evidence,
and authors should do it themselves. The reviewer checks that the proof really
exercises the claim. Use a separate `validate` assignment when a scenario is
expensive or ambiguous enough that the choice of what to check needs an
independent eye, and for the acceptance points in the scaling table above.

## Handoff

Every assignment ends with a handoff. It contains:

1. **Outcome:** what was done, or why it was not.
2. **Changes:** files, commits, branches, or tracker items touched.
3. **Proof:** the commands or observations that support each claim and their
   results. Label anything verified only by inspection.
4. **Review:** who reviewed it, whether review is outstanding, or why the
   change is trivial. Put unresolved `FIX NOW` findings first.
5. **Open items:** unverified claims, risks, skipped checks with reasons,
   blockers, and recommended follow-up.

Subskills name any additional fields they need. Leave out fields that do not
apply.

## Subskills

| Subskill | Use for | Procedure |
| --- | --- | --- |
| `orchestrate` | Running a mission, epic, or multi-item workstream: delegating, integrating, replanning, closing | [orchestrate.md](procedures/orchestrate.md) |
| `plan` | Creating or revising strategy, and shaping epics and issues for new work | [plan.md](procedures/plan.md) |
| `decide` | A consequential product or architecture choice with several credible paths | [decide.md](procedures/decide.md) |
| `implement` | Building one bounded slice with proof | [implement.md](procedures/implement.md) |
| `diagnose` | Finding the cause of a bug, failing check, regression, or unexplained behavior | [diagnose.md](procedures/diagnose.md) |
| `review` | Independent review of code or other changes someone else produced | [review.md](procedures/review.md) |
| `validate` | Independently checking scenarios or acceptance claims | [validate.md](procedures/validate.md) |
| `migrate` | Removing interfaces, intentional temporary breakage, and migration closeout | [migrate.md](procedures/migrate.md) |
| `docs` | Work where documentation accuracy is the main deliverable | [docs.md](procedures/docs.md) |
| `audit` | Evidence-backed findings about architecture or process, without fixing them | [audit.md](procedures/audit.md) |
| `readiness` | Assessing whether a repository is easy for agents to work in | [readiness.md](procedures/readiness.md) |
| `install` | Connecting Agent Factory to a repository's tracker and docs | [install.md](procedures/install.md) |

If the user names a subskill, use it. Otherwise pick the one whose purpose
fits the request. If none clearly fits, do the work directly under the core
rules above. Not every task needs a subskill.

## References

Load these only when the work needs them.

| Reference | Load when |
| --- | --- |
| [Good code](references/good-code.md) | Planning, writing, or reviewing non-trivial code |
| [Finding disposition](references/finding-disposition.md) | Deciding what to do about review or validation findings |
| [Implementation candidates](references/implementation-candidates.md) | Running spikes or competing implementations, or deciding whether working code should be kept |
| [Strategic plans](references/strategic-plans.md) | Writing or revising a mission strategy |
| [Submodel selection](references/submodel-selection.md) | Choosing models and reasoning effort for subagents |
| [Workspace lifecycle](references/workspace-lifecycle.md) | Starting, isolating, integrating, or closing out mutating work |
| [Repository shape](references/repository-shape.md) | Installing Agent Factory or assessing repository readiness |
| Tracker commands: [navigating](references/tracker-commands/navigating-work.md), [managing issues](references/tracker-commands/managing-issues.md), [evidence](references/tracker-commands/evidence-tracking.md), [integrating](references/tracker-commands/integrating-changes.md), [admin](references/tracker-commands/administration-and-recovery.md) | Operating the repository's tracker (Atelier or GitHub Issues) |

Maintainers changing this skill should read
[maintainers/skill-evaluation.md](maintainers/skill-evaluation.md) first.
