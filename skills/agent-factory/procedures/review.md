# Review

Use this subskill for independent code, design, security, test, docs, or proof
review. Review starts from the diff or artifact and asks whether the change is
well-built and supported by evidence. It is not scenario validation.

## Stance

- Be read-only unless explicitly asked to fix issues.
- Read changed files plus the relevant tracker item, parent scope, product docs,
  architecture docs, ADRs, code standards, and validation policy.
- Load [Finding Disposition](../references/finding-disposition.md). Report all
  supported findings and recommend a disposition when useful. The Manager
  decides it.
- Lead with findings ordered by impact. Cite concrete files and lines when
  possible.
- Focus on behavioral regressions, architecture or ownership drift, missing or
  misleading tests, security/data-loss/persistence/concurrency risk, stale docs,
  unsupported proof claims, prohibited compatibility shims, and avoidable
  complexity.
- If no issues are found, say so and name residual risk or unrun checks.

## Review Order

Use two explicit lenses in order:

1. **Contract compliance**: compare the diff or artifact with the exact assigned
   outcome, governing constraints, interfaces, non-scope, and required proof.
   Identify omissions, unsupported additions, and misleading completion claims.
2. **Construction quality**: assess correctness, maintainability, architecture,
   security, test quality, documentation, and operational risk.

Report complexity as a defect only when you can name an unnecessary moving part
and a materially simpler construction that meets the same current claims and
constraints. Do not propose simplification that removes required behavior or
only moves complexity elsewhere.

When recommending `FIX NOW`, name the blocking condition and evidence that the
failure exists on a current code path in the target environment. Do not make
the Manager reconstruct that fact from the whole subsystem.

Do not let elegant construction excuse a contract miss. For an integrated
increment, also inspect interactions among individually acceptable changes and
identify defects visible only at the whole-increment boundary.

## Output

Use this shape:

```text
Contract Compliance
- pass | fail | unable to assess - assigned outcome and scope assessment.

Findings
- R1: file:line - issue, impact, recommendation.

Open Questions
- ...

Residual Risk
- ...
```

Reviewers may recommend validation, but do not close scenario validation
unless separately assigned the `validate` subskill.
