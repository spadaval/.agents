# Orchestrate

Use this subskill when you are the primary coordinator for a mission, epic, or
multi-item workstream. The orchestrator scopes, delegates, integrates, reviews,
validates, checkpoints, and steers recovery.

## Operating Model

One agent, one role. Do not personally apply multiple role subskills to complete
delegated work. Spawn subagents for complex role-specific work and assign
exactly one Agent Factory subskill to each.

Use the repository's executable guidance for tactical details. In Atelier
repositories, start from `atelier man manager`, `atelier status`, focused
`atelier issue show <objective-id>`, and focused record drill-down commands.

## Orchestrator Responsibilities

- Establish the active mission, epic, or workstream and its durable scope.
- Check visible work readiness and worktree state before assigning mutating
  work.
- Resolve or block high-leverage choices before dependent implementation.
- Ensure each assigned item has clear scope, proof, evidence destination, and
  independence requirements.
- Delegate bounded worker, reviewer, validator, audit, docs, migration, and
  scout slices early enough that proof is durable.
- Integrate completed work into coherent checkpoints and preserve unrelated
  user or agent changes.
- Route high-risk diffs to `review` and scenario-centered claims to `validate`.
- Close parent work only after accountable child proof, required review or
  validation, and clean handoff state are visible through repository-owned
  product surfaces.

## Assignment Block

Every delegated worker prompt must include:

```text
Repository: <absolute path>
Active mission: <mission-id or none>
Parent epic: <epic-id or none>
Workspace/branch context: <mission workspace, owner branch, or explicit exception>
Assigned issue(s): <exact tracker IDs>
Role/subskill: <exactly one Agent Factory subskill>
Model: <model choice>
Model rationale: <complexity, ambiguity, risk, review depth, and proof need>
Owned files/workflows: <paths, modules, commands, or workflows>
Out of scope: <files, commands, policies, or adjacent issues>
Expected proof: <observable command output, file content, test, transcript, or artifact>
Evidence destination: <issue note or first-class evidence target>
Independence requirement: <none, independent review, independent validation, epic, or mission>
Dirty worktree rule: preserve unrelated changes
Final handoff schema:
  result:
  issue ID:
  subskill:
  changed files:
  evidence IDs:
  commands run:
  dirty state:
  branch/commit:
  blockers:
  exact follow-up recommendation:
```

Name required docs, ADRs, glossary terms, known breakage, and parent validation
criteria when they affect the assignment.

## Model Routing

Use smaller/faster models only for bounded, low-ambiguity, low-risk work with
concrete expected output and proof. Use a higher-reasoning model for ambiguous
architecture, broad refactors, hard debugging, public contracts, persistence,
security, migration planning, complex review, or final adversarial validation.

## Handoff

Final orchestration handoff names completed work, commits or branches, closed
items, evidence records, validation commands, residual breakage, follow-up
items, visible readiness checks, and worktree state.
