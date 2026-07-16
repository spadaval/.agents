# Integrating Changes

Use this reference to connect tracked work with workspaces, branches, commits,
reviews, and integration state. Repository workflow policy remains authoritative.

## Atelier

- Use `atelier status` to discover the active checkout, mission, and integration
  signposts.
- Use `atelier review open`, `link`, `status`, `show`, `comments`, `comment`,
  `approve`, `request-changes`, and `merge` for configured review artifacts.
- Use focused issue notes or evidence records for durable handoff and proof;
  inspect `atelier history` when integration state needs reconciliation.
- Atelier review commands do not replace issue workflow transitions.

## GitHub Issues

- Use normal repository branch and worktree policy, and link pull requests to
  their accountable issues with GitHub closing or reference syntax as
  appropriate.
- Use `gh pr create`, `view`, `diff`, `checks`, `review`, and `merge` for pull
  request state. Do not merge merely because the command is available; follow
  the repository's review and integration policy.
- Record the branch, commit, pull request, checks, and residual dirty state in
  the issue handoff when they matter to the next agent.
