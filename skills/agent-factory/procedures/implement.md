# Implement

Use this subskill to build one bounded slice and prove it works.

## Before Editing

- Read the assignment and enough surrounding code, docs, and ADRs to do it
  safely. Check that the scope and expected proof are clear. If the work is
  really a diagnosis, migration, or planning problem, say so and route it.
- For non-trivial code, read [Good Code](../references/good-code.md) and know
  where the responsibility and state should live before you write it.
- Check the workspace and run a focused baseline so later failures are not
  wrongly blamed on your change (see
  [Branches and Worktrees](../references/branches-and-worktrees.md)).
- If you were assigned an implementation candidate, read its purpose,
  question, and visibility (see
  [Implementation Candidates](../references/implementation-candidates.md)).
  Working code is not automatically kept.

## Building and Proving

**Bug fixes:** write a test or reproduction that fails for the reported
reason, watch it fail, then fix the bug and watch it pass. The failing test
proves you fixed the real problem and guards against regression.

**New behavior:** decide up front what observation would show the behavior is
missing or wrong, and make sure your proof could actually fail. A test you
have never seen fail may not test anything. Test-first is often the easiest
way to guarantee this, but the order is your call.

**Declarative, configuration, UI, or docs changes:** use the most direct
check available, such as a build, typecheck, schema validation, dry run,
rendering, or screenshot. These still count as code for review purposes when
they change behavior.

When a failing observation before the change is impractical, name the reason
and use the cheapest proof that could still show the change is wrong. That is
not a license to ship with no check at all.

Throughout:

- Make the smallest change that is coherent with the target design. That is
  not the same as the smallest diff.
- Do not add configuration, abstraction, fallbacks, or safeguards for
  hypothetical futures.
- Update docs when you change user-visible behavior, contracts, architecture,
  or ownership.
- Remove debug code, scratch files, and anything the change made obsolete.
- After the final edit, run the focused proof and relevant regression checks
  fresh, and read the complete output.

## Review

Non-trivial code goes to an independent reviewer (see
[Independent Review](../SKILL.md#independent-review)). Under an orchestrator,
the orchestrator arranges review, so report your review status as
outstanding. Working alone, spawn a reviewer yourself and give it the diff,
the requirements, and your proof, but not your rationale. If you cannot, leave
the change unmerged and say review is outstanding.

When findings arrive, check each one against the code. Fix the `FIX NOW`
findings one at a time, re-running the relevant proof. Working alone, treat
every finding the reviewer recommended as `FIX NOW` that way unless a reviewer
accepts your rebuttal. If you believe a finding is wrong, answer with a code
fact or a test. Schedule, severity, and confidence are not rebuttals. Do not
silently drop a finding or expand scope to address it. Non-trivial fixes need
review too.

## Handoff

Also report the branch or commit, and any branch or worktree you created and
its cleanup state. For
an implementation candidate, report observed behavior, design concerns, and
what you learned separately, with a recommended disposition.
