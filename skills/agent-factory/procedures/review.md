# Review

Use this subskill for independent code, design, security, test, docs, or proof
review. Review starts from the diff or artifact and asks whether the change is
well-built and supported by evidence. It is not scenario validation.

## Stance

- Be read-only unless explicitly asked to fix issues.
- In Atelier repositories, use `atelier man reviewer` for current tactical
  review commands and validation docs for proof expectations.
- Read changed files plus the relevant tracker item, parent scope, product docs,
  architecture docs, ADRs, code standards, and validation policy.
- Lead with findings ordered by severity. Cite concrete files and lines when
  possible.
- Focus on behavioral regressions, architecture or ownership drift, missing or
  misleading tests, security/data-loss/persistence/concurrency risk, stale docs,
  unsupported proof claims, and prohibited compatibility shims.
- If no issues are found, say so and name residual risk or unrun checks.

## Output

Use this shape:

```text
Findings
- Severity: file:line - issue, impact, recommendation.

Open Questions
- ...

Residual Risk
- ...
```

Reviewers may recommend validation, but they do not close scenario validation
unless separately assigned the `validate` subskill.
