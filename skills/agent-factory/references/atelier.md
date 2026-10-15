# Atelier

Agent Factory uses [Atelier](https://github.com/spadaval/atelier) as its
tracker. Atelier keeps missions, epics, issues, evidence, and reviews as
Markdown records under `.atelier/`, committed with the code they describe, and
checks a small set of invariants at the point of action. Agent Factory owns
the process; Atelier owns the records and the guards.

This reference maps Agent Factory concepts to Atelier commands. It is a map,
not a syntax manual: `atelier help <command>` is authoritative for flags and
fields, and the repository's docs and `.atelier/workflow.yaml` are
authoritative for its policy. [Tracker Records](tracker-records.md) defines
what each record contains.

## Orienting

- Start a fresh session with `atelier prime`. Use `atelier status` for checkout
  context and labeled summaries of other local work branches.
- Use `atelier work ready`, `blocked`, `active`, `all`, or `missions` for
  operational views, and `atelier work mission <id>`, `atelier work epic <id>`,
  or `atelier issue show <id>` for focused context.
- Records are branch-local. A done claim on a work branch is not base
  completion. Use Git history for past state.

## Managing Records

- Use `atelier issue create`, `show`, `update`, `transition`, `note`, `link`,
  and `unlink`. Author bodies with typed `--body` Markdown using the headings
  in [Tracker Records](tracker-records.md).
- Use epic parent fields for direct child hierarchy, `advances` links for
  mission scope, and `blocked_by` for dependencies. Missions are not parents.
- Omit the transition name to see valid transitions and blockers:
  `atelier issue transition <id>`.
- Epics begin in `draft`. Refine the outcome, add immediate children and
  dependencies, fill in the proof route, then run the `ready` transition.
  Draft epics are planning context; do not dispatch them as ready work.
- Use the `supersede` transition with a reason when evidence makes planned
  work obsolete. Preserve completed work and its evidence.
- For a prepared multi-record graph, run `atelier bundle preview <file>` before
  `atelier bundle apply`. Bundles also set fields the issue commands do not,
  such as a mission's strategy path.
- Append handoffs and progress with `atelier issue note`. Records have no
  comment threads.

## Evidence

- Use `atelier evidence record` with `--target`, `--kind`, and a summary.
  Capture a command after `--` to pin current HEAD and derive the result from
  the exit status. Manual receipts require an explicit `--result`.
- Every receipt names a full Git commit and one result. Presence alone is not
  passing proof: an older pass does not cover a later relevant change, and a
  newer failure blocks completion.
- Attach proof to the item it supports and name the producer, kind, summary,
  artifacts, and limits. Use `atelier evidence attach` only to reuse valid
  proof on another item. Correct earlier proof with a new receipt.

## Branches, Review, and Integration

- `atelier start <id>` resolves the branch owner (an epic, or a standalone
  issue), checks out or creates its work branch (`<issue_type>/<id>` by
  default), records it, and starts the item. Commit those record changes with
  the work. Missions coordinate work and own no branch.
- Atelier never creates commits. Commit records with the implementation, and
  commit the done claim on the work branch so it is reviewed with the code.
- Record review against the branch owner with `atelier review record`,
  `approve`, `finding`, and `trivial`, each with an explicit `--identity` and
  summary. Approval must come from an identity other than the code's Git
  authors. `trivial` is the visible form of the trivial-change exemption.
- Record each [finding disposition](finding-disposition.md) with
  `atelier review disposition`. `fix_now` needs a later resolution commit and
  fresh independent approval; `defer` needs an existing follow-up issue;
  `defer` and `no_action` need acceptance from a non-author identity.
- Material changes after approval (code, policy, acceptance, relationships)
  make it stale. Adding evidence or review records and in-scope status changes
  do not.
- `atelier merge <id> --check` evaluates the gates without integrating;
  `atelier merge <id>` fast-forwards the policy's base branch to the reviewed
  work and deletes the local work branch. Gates come from the base branch's
  committed policy. Merge writes no records and does not push; pushing
  follows repository policy.
- Merge integrates only into the base branch named in
  `.atelier/workflow.yaml`. Atelier does not yet support a separate mission
  integration branch, so an isolated rewrite (see `migrate`) cannot use
  gated merge until it does. Say so in the plan rather than improvising.
- Before handoff, commit canonical records and run `atelier land`. Active work
  may stay open with an honest handoff; done claims must satisfy their gates.

## Administration

- `atelier init` installs Atelier in a repository. `atelier setup claude`
  installs SessionStart and Stop hooks that run `prime` and `land`.
- `atelier check` validates every record and stops at the first structural
  error. Repair canonical records through reviewed edits and rerun it.
- `atelier prune` lists cleanup candidates; `atelier prune --apply` removes
  them. Commit canonical deletions yourself. Git history keeps the audit
  trail.
