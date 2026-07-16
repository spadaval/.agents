# Install

Use this subskill to connect Agent Factory to a repository. Installation should
identify durable sources and tracker entry points; it should not copy a second
workflow manual into the skill.

Load [Repository Shape](../references/repository-shape.md) before evaluating or
creating the repository entry map.

## Scope

Verify or create concise repository instructions that name:

- the tracker and its normal help/status entry points;
- durable product intent, domain language, architecture docs, ADRs, validation
  policy, and code standards;
- which local runtime/cache state is ignored and rebuildable, and which admin
  repair command owns it;
- any repository-specific constraints that an agent must know before invoking
  the tracker.

## Rules

- Keep `AGENTS.md` short. It is a table of contents and repository-specific
  constraint list, not a command cookbook.
- Prefer existing equivalent docs over new files.
- When a missing source matters, create tracker work for the artifact update
  instead of hiding the gap in private notes.
- Do not install compatibility shims or old command aliases unless explicitly
  requested by a human.

## Handoff

Report the sources found or created, admin setup/repair checks used, remaining
gaps, follow-up tracker IDs, and the commands or docs an agent should use to
orient in the repository.
