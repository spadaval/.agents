# Audit

Use this subskill to identify evidence-backed architecture, process, or
operability findings without designing or implementing the fix.

## Stance

- Read the mapped architecture, quality, validation, product, ADR, and domain
  sources needed for the audit scope.
- Report problems, not preferences.
- Recommend implementation only when the solution is obvious and low-ambiguity.
- Look for partial work and partial migrations: new and old paths coexisting
  without a clear boundary, docs describing a target state that commands do not
  enforce, runtime behavior that migrated only some call sites, fixtures/tests
  preserving stale assumptions, or tracker items marked complete while dependent
  cleanup remains unowned.
- When findings should become work, route them through planning conventions and
  durable tracker items.

## Finding Shape

For each finding, report:

- **Problem**: the mismatch or risk.
- **Evidence**: concrete files, commands, workflows, tests, docs, or behavior.
- **Quality smell**: coupling, low cohesion, information leakage, legacy drag,
  partial migration, partial implementation, misplaced responsibility, weak test
  interface, or speculative abstraction.
- **Likely cause**: why the design creates friction.
- **Value if fixed**: what gets simpler, safer, more local, or more reliable.
- **Risk**: what assumption could make the fix premature.
- **Confidence**: high, medium, or low.
- **Next step**: no action, spike, artifact update, implementation, migration,
  review, or validation.

Durable architecture choices belong in ADRs or target-state docs, not only in
tracker notes.
