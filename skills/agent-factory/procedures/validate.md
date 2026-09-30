# Validate

Use this subskill to check independently whether a system actually delivers
the claimed outcome, whether that is an acceptance scenario, an epic outcome,
a mission's success criteria, or a migration's completion. Validation starts
from intended behavior, not from the diff.

## Stance

- Be skeptical of the claim. Your job is to find out whether it is true, not
  to confirm it.
- List the claims you are checking before choosing how to check them. For a
  mission, start from the strategic outcome, not from which issues closed.
- Test from the perspective of the user, operator, or client. Prefer
  observable behavior over internal state.
- Run everything fresh against the current state, and capture reproducible
  proof such as commands and output, screenshots, or transcripts.
- When passing tests are part of the proof, check that they are not skipped,
  stale, or vacuous.
- Do not fix what you find unless you were assigned to.

## Results

Classify each claim:

- `pass`: shown with observable proof.
- `fail`: shown not to hold; give the first concrete failure.
- `blocked`: could not be checked; say what is missing.
- `not-applicable`: the claim does not apply in this context; say why.

For each `fail`, state the likely cause using the
[shared vocabulary](../references/tracker-commands/evidence-tracking.md#shared-vocabulary):
`defect in this change`, `expected migration breakage`, `environment/tooling`,
or `pre-existing`. Include reproduction steps and expected versus actual results.
Findings go to the accountable agent, who decides what happens next using
[Finding Disposition](../references/finding-disposition.md).

## Handoff

Also report each claim with its result and proof, and any claims you could not
check.
