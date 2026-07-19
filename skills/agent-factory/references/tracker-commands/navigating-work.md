# Navigating Work

Use this reference to orient in the tracker, find actionable work, and inspect
focused mission, epic, issue, dependency, or activity context. Repository
instructions select the tracker.

## Atelier

- Start with `atelier status` for checkout and tracker signposts.
- Use `atelier work ready`, `blocked`, `active`, `all`, or `missions` for
  operational views.
- Use `atelier work mission <mission-id>`, `atelier work epic <epic-id>`, and
  `atelier issue show <id>` for focused context.
- Use `atelier history` with mission, epic, or issue filters when current state
  needs its durable activity trail.
- `atelier man <role>` and `atelier help <command>` provide current routing and
  syntax.

## GitHub Issues

- Use `gh issue status`, `gh issue list`, and focused `gh issue view <number>`.
- Request comments or structured JSON only when the task needs them. Inspect
  parents, sub-issues, dependencies, linked pull requests, labels, assignees,
  and project fields as relevant.
- Use `gh pr status`, `gh pr view`, and `gh pr checks` when tracked work points
  to implementation or review state.
- GitHub CLI support for newer issue fields varies by installed version. Check
  `gh issue <command> --help` and use GitHub's API when the CLI does not expose
  a native relationship that the repository uses.
- `gh api` does not reliably infer a GitHub Enterprise host from the checkout
  when multiple hosts are configured. Set `GH_HOST` explicitly from the git
  remote for every raw API call, for example
  `GH_HOST=<git-origin-host> gh api ...`. Do not use `gh api` for operations
  already supported by the repository-aware high-level commands.
