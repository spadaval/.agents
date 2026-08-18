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
- When assigned as part of an implementation portfolio, read the candidate's
  strategy, relationship, learning question, prior-candidate visibility, and
  expected disposition before editing. Do not assume working code will be
  integrated.
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

Every new moving part must support a current claim or constraint. Do not add
generality, fallback paths, configuration, or safeguards only for possible
future work.

If a failing pre-change observation is impractical for generated output,
configuration, exploratory work, or a migration boundary, name the reason and
use the cheapest proof that could still falsify the claim. Do not use the
exception to justify implementing with no oracle.

When review feedback arrives, read it completely and verify it against
repository reality. The Manager assigns each finding a disposition under
[Finding Disposition](../references/finding-disposition.md). Fix only `FIX NOW`
findings. Challenge a disposition with evidence when needed, but do not expand
scope or silently defer a finding yourself. Apply fixes one at a time and rerun
the relevant focused proof.

When challenging technical evidence, name the concrete code fact and proof.
Do not argue from schedule, confidence, or severity.

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
follow-up recommendation. For an implementation candidate, report observed
behavior, construction concerns, discoveries, failed assumptions, reusable
tests or fixtures, and a recommended disposition separately. The orchestrating
Manager decides the disposition.
