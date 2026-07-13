---
name: agent-factory
description: "Use for coordinated agent work: subskill routing, mission orchestration, implementation, review, validation, docs, audit, readiness, and bounded delegation. The orchestrator assigns exactly one subskill to each subagent."
argument-hint: "[subskill] [target]"
user-invocable: true
---

# Agent Factory

Agent Factory is the portable coordination layer. It assigns bounded agent roles
from durable repository state; it is not the repository command manual.

For Atelier repositories, tactical workflow lives in Atelier's executable
surfaces: `atelier man <role>`, `atelier status`, focused `atelier issue show <objective-id>`, and focused `show`/`list`/`transition` commands. Use those
surfaces for current command names, readiness, proof, recovery, and closeout
detail. Do not encode repository-specific review, branch, provider, merge, or
completion policy in this skill; follow the process guidance emitted by Atelier
for the current checkout and work item.

## Coordination Rules

- Use repository instructions to locate the tracker, product docs, architecture
  docs, validation policy, and code standards.
- Assign exactly one subskill to each role-specific subagent.
- A subagent loads only the assigned subskill reference unless the assignment
  explicitly names additional sources.
- Configure every subagent explicitly with a model, reasoning effort, and
  self-contained prompt. Load [Submodel selection](references/submodel-selection.md)
  before spawning, select the least expensive capable model, and prefer smaller
  models for bounded bulk work such as log scanning, file reading, inventory,
  extraction, and evidence collection. Do not delegate when the runtime cannot
  explicitly set the model and reasoning effort unless a human directs that
  exception.
- Use fresh subagent context by default. `fork_context` (also called
  `fork_turns`) should almost never be used because it increases cost, weakens
  role isolation, and imports stale context. Fork only when required context
  cannot be summarized safely; record that specific justification before the
  spawn.
- Delegated assignments must include repository path, mission or issue IDs,
  branch/workspace context, assigned subskill, owned files or workflows,
  expected proof, evidence destination, independence requirements, explicit
  model and reasoning choices with rationale, and a prompt that states scope,
  sources, output, prohibitions, and completion conditions.
- Planning and execution are separate. Do not reshape tracker scope while
  implementing unless graph management is the assigned work.
- Important product, architecture, persistence, security, migration, or
  public-contract choices must be resolved durably before dependent
  implementation proceeds.
- Do not preserve obsolete commands, compatibility aliases, shims, or fallback
  behavior unless a human explicitly asks for that compatibility window.

## References

Load these only when the assignment needs the named cross-cutting guidance:

| Reference | Load when |
| --- | --- |
| [Submodel selection](references/submodel-selection.md) | Required before every delegation to choose and record the model and reasoning effort. |
| [Repository shape](references/repository-shape.md) | Installing Agent Factory, mapping durable repository guidance, or auditing agent readiness. |

Repository-specific work types, relationship semantics, commands, and lifecycle
policy remain owned by the repository and its product surfaces.

## Subskills

| Subskill | Use For | Load |
| --- | --- | --- |
| `install` | Connect Agent Factory to a repository's durable sources | [procedures/install.md](procedures/install.md) |
| `plan` | Shape missions, epics, issues, dependencies, and artifact-update work | [procedures/plan.md](procedures/plan.md) |
| `orchestrate` | Run a mission, epic, or multi-item workstream | [procedures/orchestrate.md](procedures/orchestrate.md) |
| `implement` | Execute one assigned implementation slice | [procedures/implement.md](procedures/implement.md) |
| `migrate` | Demolition, reconnect, intentional temporary breakage, or migration closeout | [procedures/migrate.md](procedures/migrate.md) |
| `review` | Independent diff, design, security, test, or proof review | [procedures/review.md](procedures/review.md) |
| `validate` | Scenario proof and independent claim classification | [procedures/validate.md](procedures/validate.md) |
| `docs` | Documentation and guidance drift cleanup | [procedures/docs.md](procedures/docs.md) |
| `audit` | Evidence-backed architecture or process-quality findings | [procedures/audit.md](procedures/audit.md) |
| `readiness` | Agent operability assessment | [procedures/readiness.md](procedures/readiness.md) |

## Selection Rules

1. If the first argument is a subskill, load that subskill reference and follow
   it.
2. If no subskill is named and none of the rules below clearly applies, ask for
   the assigned subskill.
3. If work spans a mission, epic, or multiple tracker items, use `orchestrate`.
4. If the work creates, splits, sequences, clarifies, or repairs tracker scope,
   use `plan`.
5. If the work starts from a diff, use `review`.
6. If the work starts from a scenario, behavior claim, or completion claim, use
   `validate`.
7. If the work intentionally permits breakage, closes a migration, or asks for
   demolition/reconnect classification, use `migrate`.
8. If the user asks to set up Agent Factory bindings, use `install`.
