# Review

Use this subskill to review a diff, PR, plan or other change someone else
produced: the independent review its author cannot give it. It asks whether the
change is worth merging, correct, well built and backed by real evidence;
re-running acceptance scenarios is `validate`.

## Stance

- Read the change, the requirements and constraints it answers to, and enough
  surrounding code, docs and decision records to judge it.
- Stay read-only unless asked to fix things; your review records, and the
  follow-up issue for a deferral you decide, are part of the review.
- Report every finding you can support, whatever your verdict, ordered by
  impact, with files, lines and a failure scenario where one exists. Skip style
  unless it breaks an explicit project standard.
- Approve only when no finding you would recommend `FIX NOW` is open, unless
  someone other than the change's author decided it. Reviewing a fix may cover
  only its diff.

## Verdict

First size the whole change against the outcome it serves:

- **Complexity:** *low*, held in one sitting, no new moving part; *medium*, a
  new moving part or several owners; *high*, new state, a subsystem or a
  contract others must keep, or too big to review in one pass.
- **Value:** *low*, a rare case, a hypothetical or a path planned for removal;
  *medium*, a path in current use; *high*, the outcome needs it (a Done when
  line, a regression, a current hazard).
- **Risk** of merging as is: *low*, a failure shows and is cheap to undo;
  *medium*, it reaches users or other repositories but shows and can be undone;
  *high*, silent wrong results, lost data or a security hole.

Then say **merge** if the value is worth the rest, **shrink** if a much smaller
change gets most of it (name that change), or **reject** if the cost outweighs
it (name the outcome served and why). Record a shrink or reject as a `fix_now`
finding opening `Shrink:` or `Reject:`, its severity the change's risk; merge
then waits for the smaller change and a fresh approval or, for a reject that
stands, the item's decline. The accountable agent, never the author, may
override either: `no_action` if the verdict is wrong, `wont_fix` if its point
stands but merging is worth it (high severity makes that the human's call).

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
contradictions, stale versions, statements an implementer would have to guess
at. For an integrated increment, also look for problems that appear only when
acceptable changes interact.

## Recommendations

Recommend one per finding; whoever decides it, as Independent Review's Findings
rule says, uses the same rules.

- **FIX NOW** blocks the current work. It names the blocking condition and shows
  it exists on a current path in the target environment: a contract failure (a
  missed requirement, a violated constraint or non-scope, or proof that does not
  show what it claims), a regression, a current hazard to access, secrets, user
  data or real state, or a design defect (conflicting ownership, a duplicate
  source of truth, a broken boundary, uncontained temporary code, unneeded
  complexity). A label such as "security" is not enough, and a deadline does not
  make a finding non-blocking.
  The fix is the smallest change that removes the problem; if none fits the
  strategy, remove or simplify the surface, or escalate.
- **DEFER**: real and actionable but not blocking, such as a pre-existing
  problem the change did not worsen or a risk to a surface not yet built. If you
  cannot tell whether a finding blocks, defer it, unless one small test would
  settle it; then run the test.
- **WON'T FIX**: real, but the fix would cost more than the problem, as for a
  rare failure that fails safe or one on a path planned for removal; give the
  reason. For a high-severity finding, or one the strategy's criteria touch,
  that is the human's call: leave it undisposed and label the item
  `needs-human`.
- **NO ACTION**: wrong, a duplicate, purely stylistic or without consequence,
  with a one-line reason.

Complexity is a defect only when you can name the unneeded moving part and a
simpler construction meeting the same current requirements without moving it
elsewhere: `FIX NOW` if the change added it, `DEFER` if it was there. In a
dispute, the author names the requirement it serves, the reviewer the simpler
alternative, and the smallest proof that tells them apart decides.

## Output

Use this shape, even where a brief asks for another one:

```text
Verdict:  merge | shrink | reject, with the outcome it serves and why
Sizes:    complexity, value and risk, each low | medium | high, with a reason
Contract: pass | fail | unable to assess, with one line of explanation
Fitness:  pass | fail | unable to assess, with one line of explanation

Findings
- R1 path:line: severity, problem, impact, and suggested fix.
  Recommendation: FIX NOW | DEFER | WON'T FIX | NO ACTION, with a reason.

Open questions
Residual risk and tests not run
```

A finding's severity is the harm if it is left, sized low, medium or high as
Risk is. With no findings, say so and still name any residual risk.
