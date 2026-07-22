# Implement

Use this subskill for one assigned implementation slice. Do not use it for
graph planning, independent validation, read-only review, or intentional
breaking migration.

## Stance

- Read the assigned tracker item and only enough parent, sibling, doc, ADR, and
  code context to execute the slice safely.
- Verify the item is unblocked, scoped, and has observable proof expectations.
  If it is really planning, migration, validation, or review work, stop and
  route to the correct subskill.
- Load [Workspace Lifecycle](../references/workspace-lifecycle.md) before
  mutating work. Establish isolation and classify the focused baseline before
  attributing later failures to the change.
- Update mapped docs when changing user-visible behavior, contracts,
  architecture, ownership, validation policy, or process guidance.
- Prefer focused tests or transcripts that prove the assigned outcome. Broader
  suites support proof but do not replace claim-specific evidence.

## Falsification-First Loop

For each behavior change:

1. Establish the smallest failing observation before editing: a focused test,
   reproduction, contract check, snapshot, transcript, or equivalent oracle.
2. Run it and confirm it fails for the intended reason. A test that passes,
   crashes earlier, or exercises the wrong path is not a useful red state.
3. Make the smallest coherent change that satisfies the assigned outcome.
4. Re-run the focused proof and inspect the complete result.
5. Refactor or remove residue while keeping the proof green.

If a failing pre-change observation is impractical for generated output,
configuration, exploratory work, or a migration boundary, name the reason and
use the cheapest proof that could still falsify the claim. Do not use the
exception to justify implementing with no oracle.

When review feedback arrives, read it completely, restate or clarify the
technical requirement, verify it against repository reality, and accept or
challenge it with evidence. Apply accepted findings one at a time and re-run the
relevant focused proof; do not implement feedback through performative agreement.

## Completion

Record proof in the tracker-owned place named by the issue or repository
validation policy. Use first-class evidence for non-trivial, risky, broad,
public-contract, process-policy, parent-level, migration, docs/help parity, or
stale-test claims.

Before reporting success, run fresh assignment proof after the final edit and
read its full output and exit status. Report the actual result when it does not
support the intended claim.

## Handoff

Report changed files, proof or evidence IDs, commands run, skipped checks with
reason, tracker status, dirty state, branch/commit, blockers, and exact
follow-up recommendation.
