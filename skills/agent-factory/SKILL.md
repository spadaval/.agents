---
name: agent-factory
description: "Use for coordinated agent work: installing bindings, planning tracker and mission work, orchestrating execution, implementing slices, migration, review, validation, docs, audit, and tracker hygiene. The orchestrator assigns one role/subskill per subagent."
argument-hint: "[subskill] [target]"
user-invocable: true
---

# Agent Factory

Agent Factory assigns subskills for coordinated work from durable repository
state.

## General Guidelines

- Load `AGENTFACTORY.md` first.
- For delegated work, the orchestrator explicitly assigns one subskill to each
  subagent. A subagent loads only the assigned subskill reference unless the
  assignment says otherwise.
- Spawn role-specific subagents with explicit task context: repository path,
  assigned subskill, tracker item or mission identifiers, relevant files, and
  required validation. Include expected proof and whether independent review or
  validation is required. Do not use fork-context for role-specific subagents.
- Use the tracker bound in `AGENTFACTORY.md`. For Atelier, select executable
  issues from the active mission or epic graph unless doing planning or triage.
  See [standards/tracker.md](standards/tracker.md) for commands.
- Write missions, epics, issues, validation items, and follow-up work using
  [standards/work-item-authoring.md](standards/work-item-authoring.md):
  describe the desired world and expected proof without scripting the
  implementation path.
- Use the proof rule from
  [standards/work-item-authoring.md](standards/work-item-authoring.md):
  ordinary work closes with proof on the issue, while risky, broad,
  public-contract, process-policy, parent-level, epic, and mission claims need
  first-class evidence and independent validation or review where appropriate.
- [standards/repo-workflow.md](standards/repo-workflow.md): git/worktree start, checkpoint, and handoff.
- Planning and execution are separate concerns. Do not reshape tracker scope
  while implementing unless graph management is the assigned subskill.
- High-leverage choices must be resolved before dependent implementation. If the
  outcome must be durable, create an artifact-update task.
- Use the mapped repo docs for code, architecture, validation, product, and
  quality rules.

## Subskills

| Subskill | Use For | Load |
| --- | --- | --- |
| `install` | Set up bindings/scaffolding | [procedures/install.md](procedures/install.md) |
| `plan` | Shape missions and tracker work | [procedures/plan.md](procedures/plan.md) |
| `orchestrate` | Run a mission/epic/workstream | [procedures/orchestrate.md](procedures/orchestrate.md) |
| `implement` | Execute one assigned slice | [procedures/implement.md](procedures/implement.md) |
| `migrate` | Demolition, reconnect, closeout, temporary breakage | [procedures/migrate.md](procedures/migrate.md) |
| `review` | Diff/design/security/test review | [procedures/review.md](procedures/review.md) |
| `validate` | Scenario proof | [procedures/validate.md](procedures/validate.md) |
| `docs` | Docs drift cleanup | [procedures/docs.md](procedures/docs.md) |
| `audit` | Evidence-backed architecture findings | [procedures/audit.md](procedures/audit.md) |
| `readiness` | Agent operability assessment | [procedures/readiness.md](procedures/readiness.md) |
| `tracker` | Tracker commands and item standards | [standards/tracker.md](standards/tracker.md) |
| `authoring` | Mission, epic, issue, and evidence wording | [standards/work-item-authoring.md](standards/work-item-authoring.md) |

## Subskill Rules

1. If the first argument is a subskill, load that subskill reference and follow it.
2. If no subskill is named and none of the rules below clearly applies, stop
   and ask for the assigned subskill.
3. If the work is a mission, epic, or spans multiple tracker items, use
   `orchestrate`; the orchestrator may then assign subagents to other
   subskills.
4. If the work starts from a diff, use `review`. If it starts from a scenario or
   behavior claim, use `validate`.
5. If `AGENTFACTORY.md` is missing or the user asks to set up agent-factory,
   use `install`.
6. If a tracker item intentionally permits breakage, closes out a migration, or
   asks for demolition/reconnect classification, use `migrate`.
