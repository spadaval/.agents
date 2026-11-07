# Audit

Use this subskill to find evidence-backed problems in architecture, process or
operability without designing or implementing fixes.

## Approach

- Read the architecture, product and quality docs and the decisions relevant to
  the scope, then compare them with what the code and workflows do.
- Report problems, not preferences: a finding needs a concrete consequence.
- Look especially for half-finished work: old and new paths coexisting with no
  clear boundary, docs describing a target the code does not enforce, migrations
  that reached only some call sites, tests that preserve stale assumptions, and
  done items whose dependent cleanup has no owner.
- Suggest a fix only when it is obvious; otherwise say what kind of work should
  follow.

## Findings

For each finding give the **problem**, the **evidence** (files, commands, tests
or behavior), the **impact** of fixing it, your **confidence** (high, medium or
low), and the **next step** (no action, spike, decision, implementation,
migration or docs update), adding the likely cause, or the risk that a fix would
be premature, where either is not obvious. If findings should become work, file
them as tracker items, and record architecture decisions per the [record
test](../references/atelier.md#records).
