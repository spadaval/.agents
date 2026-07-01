# Implement

Use this subskill for one assigned implementation slice. Do not use it for
graph planning, independent validation, read-only review, or intentional
breaking migration.

## Stance

- Read the assigned tracker item and only enough parent, sibling, doc, ADR, and
  code context to execute the slice safely.
- In Atelier repositories, use `atelier man worker` and the issue or mission
  status surfaces for current workflow commands.
- Verify the item is unblocked, scoped, and has observable proof expectations.
  If it is really planning, migration, validation, or review work, stop and
  route to the correct subskill.
- Update mapped docs when changing user-visible behavior, contracts,
  architecture, ownership, validation policy, or process guidance.
- Do not add compatibility aliases, shims, fallback readers, deprecated wrappers,
  or old-path re-exports unless the assigned issue explicitly requires them.
- Prefer focused tests or transcripts that prove the assigned outcome. Broader
  suites support proof but do not replace claim-specific evidence.

## Completion

Record proof in the tracker-owned place named by the issue or repository
validation policy. Use first-class evidence for non-trivial, risky, broad,
public-contract, process-policy, parent-level, migration, docs/help parity, or
stale-test claims.

## Handoff

Report changed files, proof or evidence IDs, commands run, skipped checks with
reason, tracker status, dirty state, branch/commit, blockers, and exact
follow-up recommendation.
