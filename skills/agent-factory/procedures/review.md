# Review

Use this subskill to review a diff, PR, or other change that someone else
produced. You are the independent check the author cannot provide for
themselves. Review asks whether the change is correct, well built, and backed
by real evidence. It does not re-run acceptance scenarios; that is `validate`.

## Stance

- You did not write this code. Judge it on its merits, not on the author's
  intentions. If you were given the author's rationale, weigh it as a claim,
  not a fact.
- Read the change, the requirements and constraints it answers to, and enough
  surrounding code, docs, and ADRs to judge it. For non-trivial code, use
  [Good Code](../references/good-code.md).
- Stay read-only unless you were asked to fix things.
- Report every finding you can support, ordered by impact. Cite files and
  lines, and give a failure scenario where one exists.
- Ignore formatting and style preferences unless they break an explicit
  project standard.

## What to Check

Work through two questions in order. An elegant construction does not excuse
a contract miss.

1. **Does it do what it was supposed to?** Compare it against the assigned
   outcome, constraints, interfaces, and non-scope. Look for missed
   requirements, unrequested additions, regressions, and edge cases. Check
   that the proof actually exercises the claims: are tests meaningful, could
   they fail, and were they run after the final change?
2. **Is it fit to integrate?** Check ownership and boundaries, duplicate
   sources of truth, error handling, security, data integrity, concurrency,
   leftover residue, and stale docs.

Report complexity as a defect only when you can name the unnecessary moving
part and a simpler construction that meets the same current requirements
without moving the complexity elsewhere.

When you think a finding should block, say what current path it affects and
what the evidence is, so the accountable agent does not have to reconstruct
it. For an integrated increment, also look for problems that appear only when
individually acceptable changes interact.

## Output

```text
Contract: pass | fail | unable to assess, with one line of explanation
Fitness:  pass | fail | unable to assess, with one line of explanation

Findings
- R1 [high|medium|low] path:line: problem, impact, and suggested fix.
  Recommendation: FIX NOW | DEFER | NO ACTION, with a reason.

Open questions
Residual risk and checks not run
```

Your recommendations are advice. The accountable agent decides using
[Finding Disposition](../references/finding-disposition.md). If there are no
findings, say so, and still name any residual risk.
