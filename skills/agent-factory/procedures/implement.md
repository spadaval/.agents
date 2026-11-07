# Implement

Use this subskill to build one bounded slice, code or documentation, and prove
it works.

## Before Editing

Read the assignment and enough surrounding code, docs and decisions to do it
safely, and be clear on its scope and expected proof. If it is really a
diagnosis, a migration or a planning problem, say so and route it. For
non-trivial code, know where the responsibility and state should live before you
write it.

## Building and Proving

- **Bug fixes:** write a test or reproduction that fails for the reported
  reason, watch it fail, then fix the bug and watch it pass.
- **New behavior:** decide up front what observation would show the behavior
  missing or wrong, and make sure your proof could fail; a test you have never
  seen fail may not test anything.
- **Declarative, configuration or UI changes:** use the most direct proof, such
  as a build, typecheck, schema validation, dry run or screenshot.
- **Docs:** fix each topic at its authoritative source and link to it from
  elsewhere instead of copying it. Update or delete stale competing versions,
  which mislead more than a gap does. Check each claim about commands, behavior
  or configuration against the real thing. Record a gap you cannot resolve, such
  as an unclear owner, as follow-up work instead of guessing.

When a failing observation before the change is impractical, say why and use the
cheapest proof that could still show the change is wrong. Make the smallest
change coherent with the target design, which is not always the smallest diff,
and update docs when you change user-visible behavior, contracts, architecture
or ownership. After the final edit, rerun the focused proof and relevant
regression tests and read the full output.

Tick a Done when line only when it holds. A line that cannot hold is a plan
change, not a line to rewrite yourself: report it to whoever owns the plan, the
orchestrator or else the user, who files a [loose
end](../references/atelier.md#loose-ends-and-validation-items) for work that can
only follow a merge or release.

## Review

Get review as [Independent Review](../SKILL.md#independent-review) says; under
an orchestrator, report it as outstanding. Fix each `FIX NOW` finding the
accountable agent does not overturn, one at a time, and rerun its proof. Do not
silently drop a finding or widen scope to address it.

## Handoff

Before review is requested, record your choices as decision notes or records
([record test](../references/atelier.md#records)) and write the item's `##
Report`. Its first paragraph is the outcome against Done when, naming the
targeted test behind each claim and its result. Then add, only where they say
what the diff and proof do not, `### Deviations` from the plan and why, `###
Decisions` (pointing at the notes), `### Surprises` and `### Open items`
(follow-ups and loose ends by ID, unverified claims, risks, skipped tests). Be
candid and short; the human reads it in the debrief.

Also report the branch or commit, anything you created and its cleanup state,
and for docs, the source of truth for each topic changed and any mismatch left.
For a spike or competing candidate, report its behavior, design concerns and
what it taught separately, with a recommended disposition.
