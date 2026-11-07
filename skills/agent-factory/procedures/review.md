# Review

Use this subskill to review a diff, PR or other change someone else produced:
the independent review its author cannot give it. Review asks whether the change
is correct, well built and backed by real evidence; re-running acceptance
scenarios is `validate`.

## Stance

- Read the change, the requirements and constraints it answers to, and enough
  surrounding code, docs and decision records to judge it.
- Stay read-only unless asked to fix things; your review records, and the
  follow-up issue for a deferral you decide, are part of the review.
- Report every finding you can support, ordered by impact, citing files and
  lines with a failure scenario where one exists. Ignore style preferences
  unless they break an explicit project standard.
- Approve only when no finding you would recommend `FIX NOW` is open, unless
  someone other than the change's author deferred or dismissed it. Reviewing a
  fix may cover only its diff.

## What to Look For

Ask two questions in order; elegant construction does not excuse a contract
miss.

1. **Does it do what it was supposed to?** Compare it with the outcome,
   constraints, interfaces and non-scope: missed requirements, unrequested
   additions, regressions, edge cases. Confirm the proof exercises the claims:
   could each test fail, and did it run after the final change? Each ticked Done
   when line must hold now, and a line narrowed after the start needs a reason
   the plan accepts.
2. **Is it fit to integrate?** Ownership and boundaries, duplicate sources of
   truth, error handling, security, data integrity, concurrency, residue and
   stale docs.

For documents and records, ask whether what they claim is true of the code,
decisions and other docs, and whether whoever acts on them could misread them:
contradictions, stale competing versions, vague statements an implementer would
have to guess at. For an integrated increment, also look for problems that
appear only when acceptable changes interact.

## Recommendations

Recommend one per finding; whoever decides it, as Independent Review's Findings
rule says, uses the same rules.

- **FIX NOW** blocks the current work. It names the blocking condition and shows
  it exists on a current path in the target environment: a contract failure (a
  missed requirement, a violated constraint or non-scope, or proof that does not
  show what it claims), a regression, a current hazard (unauthorized access or
  writes, exposed secrets or user data, corruption or loss of real state), or a
  design defect (conflicting ownership, a duplicate source of truth, a broken
  boundary, uncontained temporary code, unneeded complexity). A label such as
  "security" is not enough, and a deadline does not make a finding non-blocking.
  The fix is the smallest change that removes the problem; if none fits the
  strategy, remove or simplify the surface, or escalate.
- **DEFER**: real and actionable but not blocking, such as a pre-existing
  problem the change did not worsen or a risk to a surface not yet built.
  Whoever records the decision files a follow-up issue for it
  (`issue create --discovered-from <finding>`). When you cannot tell whether a
  finding blocks, defer it, unless one small test would settle it; then run the
  test.
- **NO ACTION**: wrong, a duplicate, purely stylistic or without consequence,
  with a one-line reason.

Complexity is a defect only when you can name the unnecessary moving part and a
simpler construction that meets the same current requirements without moving the
complexity elsewhere: `FIX NOW` when the change added it, `DEFER` when it was
already there. In a dispute over whether a mechanism is needed, the author names
the requirement it serves, the reviewer the simpler alternative, and the
smallest proof that tells them apart decides. Without Atelier, record decisions
in the PR or plan file as `R1 FIX NOW: <reason>`,
`R2 DEFER -> <follow-up>: <reason>` or `R3 NO ACTION: <reason>`.

## Output

Use this shape, even where a brief asks for severity labels or another one:

```text
Contract: pass | fail | unable to assess, with one line of explanation
Fitness:  pass | fail | unable to assess, with one line of explanation

Findings
- R1 path:line: problem, impact, and suggested fix.
  Recommendation: FIX NOW | DEFER | NO ACTION, with a reason.

Open questions
Residual risk and tests not run
```

With no findings, say so and still name any residual risk.
