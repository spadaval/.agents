# Install

Use this subskill to connect Agent Factory to a repository, or to assess how
easily agents can work in one. Installing points agents at the repository's own
sources; it does not copy a workflow manual into it.

## Readiness

A fresh agent should be able to answer these from the repository's entry point
(usually `AGENTS.md` or the README) and the sources it links:

1. What is this product trying to achieve, and for whom?
2. What do its core terms mean?
3. Where is current work tracked, and what state is it in?
4. What behavior is public, and what constraints are architectural?
5. Why were important non-obvious choices made?
6. How is the code built and checked, and what standards apply?
7. Which state is durable, and which is generated or local and safe to rebuild?
8. Does it use Atelier, and what are its merge policy and base branch?

Judge whether the answers exist and can be found, not whether particular files
exist: one clear README can answer what a larger repository splits across docs.
Then try what a new agent would: find the instructions, build, run the checks
and locate current work. To assess only, report an overall judgment, strengths
and gaps with evidence and why each gap matters to an agent, and fixes ordered
by value with the subskill for each.

## Tracker

Installing Atelier changes how the repository merges, so get the user's
agreement first. Then run `atelier init`, read the policy it writes (its base
branch and merge checks; without CI, put the test suite in the merge checks),
and follow the steps it prints. Run `atelier setup claude` if the team uses
Claude Code, committing its hook settings with the install, then `atelier
check`.

## Entry Point

Make the agent instructions answer the readiness questions or link to where they
are answered, and add what an agent could not work out alone: the session
commands (`atelier status` to start, `atelier land` before handoff), merge
checks or CI, where strategy files live, branch naming and where worktrees go,
and any unusual setup, permissions, generated state to rebuild rather than edit,
or review and merge policy.

Keep it a short map to each concern's home, not a command cookbook, and copy
neither record templates nor the docs it links. Split a doc only when it serves
conflicting audiences, and keep tracker configuration with its owner, such as
merge policy in `.atelier/workflow.yaml`. Anything that must survive a fresh
clone lives in version control or the tracker; caches and generated output are
marked as such and rebuildable by a documented command. When an important source
is missing and you cannot write it now, such as an unwritten product intent,
record it as follow-up work instead of inventing it.

## Handoff

Also report the sources found or created, the gaps remaining, and how a new
agent should orient in the repository.
