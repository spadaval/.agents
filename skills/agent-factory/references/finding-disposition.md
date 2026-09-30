# Finding Disposition

Use this reference to decide what happens to a review or validation finding.

## Who Decides

- **Reviewers and validators** report every finding they can support and may
  recommend a disposition.
- **The accountable agent**, the orchestrator or whoever owns the outcome,
  decides the disposition. It decides scope; it does not redo the review.
- **The author** may confirm or dispute the facts with evidence. It fixes the
  findings marked `FIX NOW`. It does not decide the disposition of findings
  on its own code. When the author is also the accountable agent (working
  alone, or an orchestrator's own code), it fixes every finding the reviewer recommended as `FIX NOW` unless a
  reviewer accepts its rebuttal. A recommended `FIX NOW` it leaves unresolved
  is reported first in the handoff, and the work is not done.
- **A human** decides when the answer depends on risk tolerance or authority
  that no durable source settles.

Severity describes impact, not priority. A "high severity" label does not
make a finding blocking, and a deadline does not make it non-blocking. A
`FIX NOW` recommendation must name the blocking condition and show that it
exists on a current code path in the target environment. A label such as
"security" or "maintainability" is not enough by itself.

If deciding requires a fact you do not have, or the reviewer and author
disagree about a fact, ask one focused question of the reviewer, the author,
or a `diagnose` worker. Decide once you have the answer. Do not reinvestigate
the subsystem yourself.

## FIX NOW

The finding blocks the current work. Use this when evidence shows at least
one of the following:

1. **Contract failure:** the change misses a current requirement, violates a
   constraint or non-scope boundary, or relies on proof that does not show
   what it claims.
2. **Regression:** the change breaks something that worked. Breakage is
   acceptable only on an isolated rewrite branch declared in the plan (see
   `migrate`), never on the default branch.
3. **Current hazard:** in the actual target environment, the change allows
   unauthorized access or writes, exposes secrets or user data, or can
   corrupt or destroy real state. "Only admins can reach it" and "the release
   is late" are not rebuttals to a real current hazard.
4. **Design integrity:** the change introduces conflicting ownership, a
   duplicate source of truth, a broken dependency boundary, uncontained
   temporary code, or unnecessary complexity (see below).

Fix blocking findings with the smallest change that removes the problem, not
with a framework for future problems. If a blocking finding cannot be fixed
within the current strategy, remove or simplify the affected surface, or
escalate. Never quietly downgrade it.

## DEFER

The finding is real and actionable but does not block the current work.
Typical cases are pre-existing problems the change did not worsen, and risks
that apply only to surfaces not yet built. Create a follow-up issue and link
it, or add a follow-up entry to the PR description or plan file if there is no
tracker. It is not a blocker unless you explicitly make it one.

When a finding is real but you cannot tell whether it blocks, defer it,
unless one small check could settle the question. In that case, run the
check.

## NO ACTION

The finding is wrong, a duplicate, purely stylistic, or has no consequence.
It may also protect a surface that should not exist or concern something
explicitly outside the product. Record a one-line reason.

## Complexity

After meeting current requirements, prefer the design with the fewest moving
parts: components, abstractions, interfaces, state, configuration, fallbacks,
or compatibility paths. Fewer lines alone does not make a design simpler.

Complexity is a defect when a known, simpler construction meets the same
current requirements without moving equivalent complexity elsewhere.
Unneeded complexity introduced by the current change is `FIX NOW`.
Pre-existing complexity the change does not worsen is `DEFER`.

When a reviewer and author disagree about whether a mechanism is necessary,
the author must name the current requirement it serves and what would break
without it. The reviewer must name the simpler alternative. Get the smallest
proof that tells them apart. Machinery justified only by possible future work
does not survive this test.

## Recording

Record the decisions where the work is tracked (tracker, PR, or plan file).
Keep it short:

```text
R1 FIX NOW: <reason>
R2 DEFER -> <follow-up link>: <reason>
R3 NO ACTION: <reason>
```

Do not keep a separate findings registry.
