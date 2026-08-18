# Finding Disposition

Use this reference when review or validation reports a finding.

## Roles

- The reviewer reports every supported finding and may recommend a disposition.
- The Manager chooses `FIX NOW`, `DEFER`, or `NO ACTION`.
- The implementer may confirm or challenge the technical evidence. It fixes
  only `FIX NOW` findings.
- A human decides when the choice depends on risk tolerance or authority that
  durable sources do not establish.

Severity describes impact. It does not decide priority.

The Manager owns the scope decision, not code-level fact-finding. A `FIX NOW`
recommendation must name the blocking condition and evidence that it exists on
a current path. If a needed fact is missing or disputed, ask the reviewer,
implementer, or an investigator one bounded question. Decide after the answer;
do not inspect the whole subsystem or create a standing adjudication role.

## FIX NOW

Use `FIX NOW` only when evidence proves at least one of these:

1. **Current-contract fault:** the change fails a current acceptance claim or
   user scenario, violates a governing constraint or non-scope boundary, adds
   an unauthorized substantial subsystem, or relies on misleading proof.
2. **Change-caused regression:** the change breaks behavior that worked before
   and the active strategy does not authorize that breakage.
3. **Concrete current hazard:** in the actual target environment, the change
   allows unauthorized access, execution, or writes; exposes real secrets or
   customer data; or can corrupt or irreversibly destroy real state.

A label such as security, correctness, or high severity is not enough by
itself. Show the current surface and failure.

If a blocking finding cannot be repaired within the active strategy, simplify
or remove the affected surface, reimplement it, or return to strategy or a
human decision. Do not silently defer it.

## DEFER

Use `DEFER` for a real, actionable problem that does not meet `FIX NOW`.

Create a normal bug or enhancement issue and link the finding. The new issue is
not a dependency or blocker for current work unless the Manager explicitly
makes it one.

Pre-existing problems that the change does not worsen belong here. If a problem
is supported but its blocking status is unclear, default to `DEFER`.
The Manager may request the smallest bounded check that could prove a blocking
condition. If it does not, defer.

## NO ACTION

Use `NO ACTION` when the finding is false, duplicate, only stylistic, has no
concrete planned surface, is explicitly outside the product, protects a surface
that should be removed, or has no independent actionable outcome.

## Complexity

After preserving the current outcome and constraints, choose the solution with
the least total system complexity.

Complexity is a defect only when a known, materially simpler construction meets
the same current claims and constraints without moving equivalent complexity
elsewhere. Materially simpler means removing a moving part: a component,
abstraction, interface, state model, persistence model, configuration option,
fallback, compatibility path, or operational handoff. Fewer lines alone do not
prove it.

Every new moving part must support a current claim or constraint. If its only
reason is possible future work, defer it.

A proven complexity defect introduced by the current change is a
current-contract fault: `FIX NOW`. Pre-existing complexity that the change does
not worsen is `DEFER`.

When agents disagree, the agent claiming a mechanism is necessary must name the
current claim and the concrete failure caused by removing it. The agent seeking
simplification must name a simpler construction that meets the same claim. The
Manager obtains the smallest proof that separates the two. If the answer
depends on unrecorded scope or risk tolerance, ask the human.

## Tracker Record

Put the review and the Manager's disposition on the accountable issue. Keep it
short:

```text
R1 FIX NOW — <reason>
R2 DEFER -> #<issue> — <reason>
R3 NO ACTION — <reason>
```

Do not create a separate finding registry or shadow backlog.
