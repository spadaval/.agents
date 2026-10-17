# Install

Use this subskill to connect Agent Factory to a repository: identify, or
create where missing, the durable sources and tracker entry points agents
need. Installation points agents at existing sources. It does not copy a
workflow manual into the repository.

Read [Repository Shape](../references/repository-shape.md) first.

## Tracker

Agent Factory's tracker is [Atelier](../references/atelier.md). If the
repository does not use it yet and the user agrees to install it:

1. Confirm the `atelier` CLI is on `PATH`.
2. Run `atelier init` on the default branch, review the generated
   `.atelier/workflow.yaml` (its `base_branch` and any `merge_checks`), and
   commit it. Merge gates are read from the base branch's committed policy,
   so the policy must be there before governed work starts.
3. Run `atelier setup claude` when the team uses Claude Code, and commit the
   shared hook settings deliberately.
4. Run `atelier check`.

Installing Atelier changes how the repository merges work, so get the user's
agreement first. Without it, use the plan-file fallback described in the
skill.

## Approach

Make sure the repository's agent instructions (usually `AGENTS.md`) say, or
link to:

- that the repository uses Atelier, and the session commands agents run
  (`atelier status` to start, `atelier land` before handoff);
- where product intent, domain vocabulary, architecture, decisions, and code
  standards live;
- how to build and run the checks;
- where strategy files live, if not the default in
  [Strategic Plans](../references/strategic-plans.md#where-it-lives);
- branch naming, the default and integration branches, and where worktrees
  go, when these differ from
  [Branches and Worktrees](../references/branches-and-worktrees.md);
- anything unusual an agent must know first, such as setup steps,
  permissions, generated state that should be rebuilt rather than edited, or
  review and merge policy.

Do not copy record templates into `AGENTS.md`. Agent Factory's
[Tracker Records](../references/tracker-records.md) define issue contents.
Record only where the repository deliberately differs, or point to the
repository's own issue templates.

Keep `AGENTS.md` short. It is a map and a list of repository-specific
constraints, not a command cookbook. Prefer linking existing docs over
creating new ones. Create a new doc only when the information is needed and
has no home.

When an important source is missing and you cannot create it now, such as a
product intent nobody has written down, record it as follow-up work rather
than inventing the content.

## Handoff

Also report the sources found or created, gaps remaining, and how a new agent
should orient in the repository.
