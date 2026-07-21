# Validate

Use this subskill for validation items, assigned scenarios, and terminal claim
checks. Validation starts from the intended behavior, not from the diff.

## Stance

- Be adversarial about the claim.
- List the strategic-plan, mission, or issue outcome lines you are validating
  before choosing proof. Mission validation starts from the strategic outcome,
  not from whether the planned issues were closed.
- Prefer observable behavior over internal assumptions.
- Classify each relevant claim as `pass`, `fail`, `blocked`, `deferred`, or
  `not-applicable`.
- Capture reproducible proof: command transcript, file content, test result,
  screenshot, manual step record, artifact path, or evidence ID.
- Inspect ignored, skipped, or stale tests when test freshness is part of the
  claim or when passing tests are used as proof.
- Check docs/help consistency when public commands, workflow policy, or Agent
  Factory guidance are part of the claim.
- Do not fix defects unless the tracker item explicitly assigns implementation
  work.

## Proof Choice

Use the proof method named by the tracker item. If it leaves the method open,
choose the smallest proof that genuinely exercises the claim. Use first-class
evidence for independent validation, parent-level claims, process policy,
public contracts, migrations, stale-test risk, and non-pass classifications.

For a completion or readiness claim, identify the exact command or observation
that proves it, run it fresh after the final relevant change, inspect the full
result and exit status, and attach that evidence to the classification. A prior
run, cached result, issue status, or another agent's assertion is insufficient.

## Failure Handling

For every non-pass result, name the first concrete failure and classify it as an
in-scope defect, expected migration breakage, environment/tooling failure,
pre-existing failure, deferred validation with owner, or not applicable.
Create or identify follow-up work instead of silently broadening scope.
Report the finding to the orchestrating Manager; validation does not decide by
itself that a repair becomes part of the mission's critical path.

## Handoff

Report scenario result, line-by-line classifications, evidence IDs or artifacts,
commands or steps run, ignored-test review, docs/help consistency result,
failures, follow-up items, and deferred validation.
