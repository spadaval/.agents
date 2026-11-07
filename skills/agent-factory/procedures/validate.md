# Validate

Use this subskill to find out independently whether a system delivers a claimed
outcome: an acceptance scenario, an increment outcome, a mission's success
criteria or a migration's completion. Start from intended behavior, not from the
diff.

## Stance

- Be skeptical: your job is to find out whether the claim is true, not to
  confirm it.
- List the claims before choosing how to test them. For a mission, start from
  the strategic outcome, not from which issues are done.
- Test as the user, operator or client would, preferring observable behavior to
  internal state.
- Run everything fresh against the current state, and capture reproducible proof
  such as commands and output, screenshots or transcripts. Confirm that passing
  tests you rely on are not skipped, stale or vacuous.
- Do not fix what you find unless you were assigned to.

## Results

Give each claim a result: `pass` (shown with observable proof), `fail` (shown
not to hold; give the first concrete failure), `blocked` (could not be tested;
say what is missing) or `not-applicable` (say why). For each `fail`, give
reproduction steps, expected and actual results, and the likely cause: `defect
in this change`, `expected breakage` (only on a rewrite branch the plan
declares), `environment/tooling` or `pre-existing`. Findings go to the
accountable agent, who decides what happens next.

With Atelier, record a receipt for each claim on the validation item (`atelier
evidence record --help` covers mission success criteria too), and finish the
item as [Atelier](../references/atelier.md#loose-ends-and-validation-items)
says.

## Handoff

Also report each claim with its result and proof, and any claim you could not
test.
