# Docs

Use this subskill when documentation accuracy is the main deliverable, such
as fixing drift, recording decisions, or updating guidance after a change.

## Approach

- Find the authoritative source for each topic through the repository's
  instructions and docs index. Fix the source, and link to it from elsewhere
  instead of copying it.
- Remove competing versions of the truth. Stale guidance is worse than
  missing guidance because it confidently misleads, so update it, delete it,
  or clearly mark it superseded.
- Test claims against reality. Where docs describe commands, behavior, or
  configuration, run or inspect the real thing rather than trusting the old
  text.
- When a decision changes, write a superseding decision record or ADR (see
  [Tracker Records](../references/tracker-records.md#decision)); do not
  rewrite accepted history.
- When you find a gap you cannot resolve, such as an unclear owner or an
  undecided behavior, record it as follow-up work instead of guessing.

## Verification

Run whatever proves the changed surface: link checks, doc builds, command
help, or executing documented examples. Non-trivial doc changes then get
independent review like any other change (see
[Independent Review](../SKILL.md#independent-review)).

## Handoff

Also report stale claims removed, the source of truth for each changed topic,
and unresolved mismatches.
