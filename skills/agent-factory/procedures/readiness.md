# Readiness

Use this subskill to assess whether a repository is legible and operable by
agents. It evaluates the agent operating environment, not product code quality.

Load [Repository Shape](../references/repository-shape.md) as the portable
readiness baseline, then apply the repository's own instructions and product
surfaces.

## Scope

Check whether a fresh agent can locate:

- repository instructions and tracker identity;
- product intent and domain language;
- docs map, architecture docs, validation policy, ADRs, and code standards;
- current tracker status and role guidance;
- runnable validation commands and focused role/status commands.

Do not treat hidden diagnostics, local-state repair, or maintenance commands as
normal readiness paths.

## Report

Report conversationally:

1. Overall readiness judgment.
2. Strengths with evidence.
3. Gaps with concrete evidence.
4. Recommended fixes and the subskill that should own each.

If the user asks to record findings, create or update tracker items instead of
checking in a private report.
