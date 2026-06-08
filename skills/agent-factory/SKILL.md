---
name: agent-factory
description: "Use for coordinated agent work: installing bindings, planning tracker work, orchestrating execution, implementing slices, migration, review, validation, docs, audit, and tracker hygiene. The orchestrator assigns one role/subskill per subagent."
argument-hint: "[subskill] [target]"
user-invocable: true
---

# Agent Factory

The agent factory is the subskill assigner for coordinated agent work. It assigns
subskills so agents operate from durable repository state, not private chat history.

## General Guidelines

- Load `AGENTFACTORY.md` first. It binds this operating model to concrete repo
  paths, commands, checks, and product-specific skills.
- For delegated work, the orchestrator explicitly assigns one subskill to each
  subagent. A subagent loads only the assigned subskill reference unless the
  assignment says otherwise.
- The durable work queue is the tracker bound in `AGENTFACTORY.md`. Route
  planning, claim, update, dependency, close, lint, and sync/check operations
  through that binding. See [standards/tracker.md](standards/tracker.md) for
  tracker abstraction and command examples. Beads is legacy/fallback only; see
  [standards/beads.md](standards/beads.md) when a repository explicitly binds
  to Beads or archived data must be inspected.
- [standards/repo-workflow.md](standards/repo-workflow.md): git/worktree start, checkpoint, and handoff.
- Planning and execution are separate concerns. Do not reshape tracker scope
  while implementing unless graph management is the assigned subskill.
- For unresolved high-leverage decisions with multiple plausible paths, use
  `$decision-lab` before shaping tracker work or orchestration. The lab
  decides; the factory builds.
- Use the mapped repo docs for code, architecture, validation, product, and
  quality rules.

## Subskills

| Subskill      | Use For                                                                                   | Load                                                   |
| ------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `install`     | Installing agent-factory in a repository and creating required bindings/scaffolding       | [procedures/install.md](procedures/install.md)         |
| `plan`        | Creating, splitting, sequencing, clarifying, or cleaning up tracker work                  | [procedures/plan.md](procedures/plan.md)               |
| `orchestrate` | Running an epic or multi-item workstream and assigning subagents                          | [procedures/orchestrate.md](procedures/orchestrate.md) |
| `implement`   | Executing one ordinary assigned tracker item or owned slice                               | [procedures/implement.md](procedures/implement.md)     |
| `migrate`     | Demolition, reconnect, closeout, or other intentional temporary breakage                  | [procedures/migrate.md](procedures/migrate.md)         |
| `review`      | Adversarial diff, code, design, architecture, security, or test-quality review            | [procedures/review.md](procedures/review.md)           |
| `validate`    | Scenario-centered product, operator, browser, runtime, integration, or preservation proof | [procedures/validate.md](procedures/validate.md)       |
| `docs`        | Documentation refresh, reconciliation, or docs/process drift cleanup                      | [procedures/docs.md](procedures/docs.md)               |
| `audit`       | Evidence-backed architecture-quality findings without implementing fixes                  | [procedures/audit.md](procedures/audit.md)             |
| `readiness`   | Assessing whether a repository is legible and operable by agents                          | [procedures/readiness.md](procedures/readiness.md)     |
| `tracker`     | Bound tracker abstraction, command routing, item standards, dependencies, and sync/check  | [standards/tracker.md](standards/tracker.md)           |
| `beads`       | Legacy Beads command mechanics for repositories still explicitly bound to Beads           | [standards/beads.md](standards/beads.md)               |

## Subskill Rules

1. If the first argument is a subskill, load that subskill reference and follow it.
2. If no subskill is named and none of the rules below clearly applies, stop
   and ask for the assigned subskill.
3. If the work is an epic or spans multiple tracker items, use `orchestrate`; the
   orchestrator may then assign subagents to other subskills.
4. If the work starts from a diff, use `review`. If it starts from a scenario or
   behavior claim, use `validate`.
5. If `AGENTFACTORY.md` is missing or the user asks to set up agent-factory,
   use `install`.
6. If a tracker item intentionally permits breakage, closes out a migration, or
   asks for demolition/reconnect classification, use `migrate`.
