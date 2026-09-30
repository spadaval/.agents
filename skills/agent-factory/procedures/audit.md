# Audit

Use this subskill to find evidence-backed problems in architecture, process,
or operability without designing or implementing fixes.

## Approach

- Read the architecture, product, and quality docs and the ADRs relevant to
  the scope, then compare them with what the code and workflows actually do.
- Report problems, not preferences. A finding needs a concrete consequence.
- Look especially for half-finished work: old and new paths coexisting with no
  clear boundary, docs describing a target the code does not enforce,
  migrations that reached only some call sites, tests that preserve stale
  assumptions, and tracker items closed while dependent cleanup has no owner.
- Suggest a fix only when it is obvious. Otherwise say what kind of work
  should follow.

## Findings

For each finding give:

- **Problem:** the mismatch or risk.
- **Evidence:** the files, commands, tests, or behavior that show it.
- **Impact:** what gets simpler, safer, or more reliable if it is fixed.
- **Confidence:** high, medium, or low.
- **Next step:** no action, spike, decision, implementation, migration, or
  docs update.

Add the likely cause, or the risk that a fix would be premature, when either
is not obvious.

If findings should become work, record them as tracker items, or in a plan
file if there is no tracker. Architecture decisions
belong in docs or ADRs, not only in tracker notes.
