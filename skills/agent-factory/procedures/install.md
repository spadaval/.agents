# Install

Use this subskill to connect Agent Factory to a repository: identify, or
create where missing, the durable sources and tracker entry points agents
need. Installation points agents at existing sources. It does not copy a
workflow manual into the repository.

Read [Repository Shape](../references/repository-shape.md) first.

## Approach

Make sure the repository's agent instructions (usually `AGENTS.md`) say, or
link to:

- which tracker the repository uses, where it is, and how Agent Factory
  concepts such as missions, epics, and evidence map onto it when it does not
  model them natively;
- where product intent, domain vocabulary, architecture, decisions, and code
  standards live;
- how to build and run the checks;
- where strategy files live, if the repository keeps them in a particular
  place;
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
