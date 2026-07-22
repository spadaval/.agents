---
name: agent-factory
description: "Use when Codex needs to decide a consequential product, architecture, or strategy choice, publish or execute mission strategy, manage missions, epics, issues, or dependencies, orchestrate or delegate bounded work to subagents, diagnose unexplained failures, or review, validate, audit, or integrate evidence."
---

# Agent Factory

Agent Factory is the portable coordination layer. It assigns bounded agent roles
from durable repository state; it is not the repository command manual.

Agent Factory deliberately keeps useful coordination concepts such as missions,
epics, evidence, and independent validation even when a repository's tracker
does not model them directly. Repository instructions select the tracker;
tracker command references explain how to realize those concepts there.

The [Constitution](constitution.md) declares the intent this skill
operationalizes and is the final arbiter when procedures conflict, are silent,
or a judgment call exceeds any single procedure. Load it to arbitrate between
rules, to handle a situation no procedure covers, or before changing Agent
Factory itself.

## Coordination Rules

- Use repository instructions to locate the tracker, product docs, architecture
  docs, validation policy, and code standards.
- For a substantial mission, locate its active strategic plan before shaping
  or executing work. The strategic plan owns the intended outcome, target
  system shape, governing tradeoffs, boundaries, and adaptation guidance; the
  mission's epics, issues, and dependencies are its implementation plan.
- Plan the whole mission strategically, but elaborate implementation work only
  as far as current evidence supports. Mission completion is judged against the
  strategic outcome and proof, not merely against issue closure.
- Publish or semantically revise strategy only through `plan` in a commissioned
  strategy session: a human asks to establish or reconsider strategy, or
  answers a concrete strategic question. Routine task traffic, silence, generic
  continuation, and automatic turns do not commission one. Other agents may
  research and propose.
- Use `$generate-html-plan` when a visual, interactive planning surface would
  materially improve deliberation. Publish its result through `plan` before
  Agent Factory execution.
- Procedures define intent and policy. When they require tracker interaction,
  load the matching tracker command reference and use the section for the
  repository's selected tracker. Treat live command help as authoritative for
  current syntax.
- Announce the selected or assigned subskill and its purpose before acting on
  it. When it defines a checklist or fixed method, track the items as they
  complete.
- Assign exactly one subskill to each role-specific subagent.
- A subagent loads the assigned subskill and only the tracker command references
  needed to act. Other skill references must be named explicitly, either in the
  assignment prompt or in the subskill itself.
- Configure every subagent explicitly with a model, reasoning effort, and
  self-contained prompt. Load [Submodel selection](references/submodel-selection.md)
  before spawning and choose the model/run portfolio per its guidance. Do not
  delegate when the runtime cannot explicitly set the model and reasoning
  effort unless a human directs that exception.
- Use fresh subagent context by default; fork only per the
  [Submodel selection](references/submodel-selection.md) policy.
- Give every delegated assignment the full assignment template in
  [Orchestrate](procedures/orchestrate.md).
- Planning and execution are separate at the Worker assignment level. Workers
  do not reshape tracker scope while implementing unless graph management is
  their assigned work; the orchestrating Manager may revise the implementation
  plan as evidence changes.
- Important product, architecture, persistence, security, migration, or
  public-contract choices must be resolved durably before dependent
  implementation proceeds.
- Before claiming that work is fixed, passing, complete, or ready, identify the
  proof that establishes the claim, run it fresh, inspect the complete result,
  and report the claim with that evidence. A prior run, delegated assertion, or
  broad green suite is not fresh claim-specific proof.
- Do not preserve obsolete commands, compatibility aliases, shims, deprecated
  wrappers, or fallback behavior unless a human or the governing tracker item
  explicitly makes compatibility the deliverable.

## References

Load these only when the assignment needs the named cross-cutting guidance:

| Reference | Load when |
| --- | --- |
| [Submodel selection](references/submodel-selection.md) | Required before every delegation to choose and record the model and reasoning effort. |
| [Strategic plans](references/strategic-plans.md) | Creating, publishing, executing, or materially replanning a substantial mission. |
| [Repository shape](references/repository-shape.md) | Installing Agent Factory, mapping durable repository guidance, or auditing agent readiness. |
| [Workspace lifecycle](references/workspace-lifecycle.md) | Starting mutating work, selecting isolation, checking a baseline, integrating, or closing a workspace. |
| [Skill evaluation](references/skill-evaluation.md) | Modifying Agent Factory guidance or testing whether its behavioral controls work. |
| [Navigating work](references/tracker-commands/navigating-work.md) | Finding status, ready work, or focused mission, epic, issue, and dependency context. |
| [Managing issues](references/tracker-commands/managing-issues.md) | Creating, relating, updating, transitioning, or closing tracked work. |
| [Evidence tracking](references/tracker-commands/evidence-tracking.md) | Recording, attaching, inspecting, or classifying proof. |
| [Integrating changes](references/tracker-commands/integrating-changes.md) | Connecting tracked work to branches, commits, reviews, and integration state. |
| [Administration and recovery](references/tracker-commands/administration-and-recovery.md) | Setting up, checking, diagnosing, repairing, or pruning tracker state. |

Load tracker command references only as the work needs them. They provide
mechanics, not a second procedure or a substitute for repository policy.

## Subskills

| Subskill | Use For | Load |
| --- | --- | --- |
| `install` | Connect Agent Factory to a repository's durable sources | [procedures/install.md](procedures/install.md) |
| `decide` | Resolve consequential product, architecture, or strategy choices | [procedures/decide.md](procedures/decide.md) |
| `plan` | Publish strategic plans and shape missions, epics, issues, dependencies, and artifact-update work | [procedures/plan.md](procedures/plan.md) |
| `orchestrate` | Run a mission, epic, or multi-item workstream | [procedures/orchestrate.md](procedures/orchestrate.md) |
| `diagnose` | Establish reproduction and root cause for a bug, failed check, or unexpected behavior | [procedures/diagnose.md](procedures/diagnose.md) |
| `implement` | Execute one assigned implementation slice | [procedures/implement.md](procedures/implement.md) |
| `migrate` | Demolition, reconnect, intentional temporary breakage, or migration closeout | [procedures/migrate.md](procedures/migrate.md) |
| `review` | Independent diff, design, security, test, or proof review | [procedures/review.md](procedures/review.md) |
| `validate` | Scenario proof and independent claim classification | [procedures/validate.md](procedures/validate.md) |
| `docs` | Documentation and guidance drift cleanup | [procedures/docs.md](procedures/docs.md) |
| `audit` | Evidence-backed architecture or process-quality findings | [procedures/audit.md](procedures/audit.md) |
| `readiness` | Agent operability assessment | [procedures/readiness.md](procedures/readiness.md) |

## Selection Rules

1. If the first argument is a subskill, load that subskill and follow it.
2. If no subskill is named and none of the rules below clearly applies, ask for
   the assigned subskill.
3. If a consequential unresolved choice has multiple plausible paths, use
   `decide`.
4. Use `plan` for initial planning, strategy publication or revision, standalone
   graph shaping, or graph reconciliation after a strategic change. If a
   substantial requested mission has no active governing strategy or initial
   outcome shape, use `plan` before `orchestrate`.
5. If work executes an already-shaped mission, epic, or multi-item workstream,
   use `orchestrate`. An active orchestrator maintains its own implementation
   graph.
6. If the work starts from an unexplained bug, failed check, performance
   regression, integration failure, or unexpected behavior, use `diagnose`
   before proposing a fix.
7. If the work starts from a diff, use `review`.
8. If the work starts from a scenario, behavior claim, or completion claim, use
   `validate`.
9. If the work intentionally permits breakage, closes a migration, or asks for
   demolition/reconnect classification, use `migrate`.
10. If the user asks to set up Agent Factory bindings, use `install`.
11. If the user asks for evidence-backed architecture, process, or operability
    findings without designing or implementing fixes, use `audit`.
12. If the user asks whether a repository is legible and operable by agents,
    use `readiness`.
13. If documentation or guidance freshness is the primary deliverable, use
    `docs`.
14. `implement` is reached through assignment (rules 1 and 2).
