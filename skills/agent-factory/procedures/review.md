# Review

Use this subskill for independent code, design, security, test, docs, or proof
review. Review starts from the diff or artifact and asks whether the change is
well-built and supported by evidence. It is not scenario validation.

## Stance

- Be read-only unless explicitly asked to fix issues.
- Read changed files plus the relevant tracker item, parent scope, product docs,
  architecture docs, ADRs, code standards, and validation policy.
- Lead with findings ordered by severity. Cite concrete files and lines when
  possible.
- Focus on behavioral regressions, architecture or ownership drift, missing or
  misleading tests, security/data-loss/persistence/concurrency risk, stale docs,
  unsupported proof claims, and prohibited compatibility shims.
- If no issues are found, say so and name residual risk or unrun checks.

## Review Order

Use two explicit lenses in order:

1. **Contract compliance**: compare the diff or artifact with the exact assigned
   outcome, governing constraints, interfaces, non-scope, and required proof.
   Identify omissions, unsupported additions, and misleading completion claims.
2. **Construction quality**: assess correctness, maintainability, architecture,
   security, test quality, documentation, and operational risk.

Do not let elegant construction excuse a contract miss. For an integrated
increment, also inspect interactions among individually acceptable changes and
identify defects visible only at the whole-increment boundary.

## Output

Use this shape:

```text
Contract Compliance
- pass | fail | blocked - assigned outcome and scope assessment.

Findings
- Severity: file:line - issue, impact, recommendation.

Open Questions
- ...

Residual Risk
- ...
```

Reviewers may recommend validation, but they do not close scenario validation
unless separately assigned the `validate` subskill.
