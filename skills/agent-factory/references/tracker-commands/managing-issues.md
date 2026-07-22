# Managing Issues

Use this reference to create, classify, relate, update, transition, or close
missions, epics, issues, and validation work. Agent Factory procedures define
the record's meaning and required content.

## Atelier

- Use focused `atelier issue create`, `show`, `update`, `transition`, `note`,
  `link`, and `unlink` commands. Inspect subcommand help before uncommon or
  consequential mutations.
- Omit the transition name to inspect currently valid transitions and blockers:
  `atelier issue transition <id>`.
- Use parent fields for hierarchy and typed links for other relationships.
- For a prepared multi-record graph change, use `atelier bundle preview` before
  `atelier bundle apply`.

## GitHub Issues

- Use `gh issue create`, `edit`, `comment`, `close`, and `reopen`; use assignees
  and repository-defined status metadata to make active ownership visible.
- Missions, epics, and validation issues remain Agent Factory concepts. Use the
  repository's configured issue types when suitable; otherwise use durable
  labels such as `agent-factory:mission`, `agent-factory:epic`, and
  `agent-factory:validation`.
- Preserve the procedure's Outcome, scope, non-scope, and dependency content in
  the issue body. Do not reduce a mission to a title and label.
- Use native parent/sub-issue and blocking relationships. Current GitHub CLI
  versions may expose these on `gh issue create` and `gh issue edit`; check live
  help and use the GitHub API when necessary.
- For raw `gh api` calls, follow the `GH_HOST` rule in
  [Administration and recovery](administration-and-recovery.md); do not use
  `gh api` for ordinary issue operations supported by `gh issue`.
- Treat Projects and custom fields as repository-selected enhancements, not as
  prerequisites for using GitHub Issues.
