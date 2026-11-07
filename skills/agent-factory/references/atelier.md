# Atelier

Agent Factory uses [Atelier](https://github.com/spadaval/atelier) as its
tracker: Markdown records under `.atelier/`, committed with the code they
describe, and gates where records are written, review is requested, work
merges and sessions hand off. This reference is a map: `atelier help
<command>` is authoritative for flags, `.atelier/workflow.yaml` for policy,
and [Tracker Records](tracker-records.md) for what each record contains.

## Words

As tracker terms, these words carry only these meanings, here and in
Atelier's help, docs and `CONTEXT.md`:

- **check**: `atelier check` (record and graph rules), the policy's merge checks
  (commands that run on the merged tree, or confirm CI did), or `atelier
  merge --check` (the merge gates without merging). An item's Done when is
  made of **lines**.
- **review**: independent review by someone who did not write the work: an
  agent reviewing a change or plan, or the human, who approves a mission's
  plan (`atelier brief`) and reviews its merged work (`atelier debrief`).
- **land**: `atelier land`, run at every handoff: it judges committed records
  and the commits about to be pushed.
- **done**: the status work gets when `atelier merge` integrates it; the
  status a decision, loose end or validation gets on the base; and the status
  of a closed mission. Superseded is the other terminal status.
- **close**: what a mission does, by the orchestrator running `atelier issue
  transition <mission> close` with its report, once all its work is merged
  and its validation items, if any, are done (see
  [Closing a Mission](../procedures/orchestrate.md#closing-a-mission)).
  Nothing else closes.

## One Issue, in Order

Each step names who does it; an author working alone does the
orchestrator's steps too. The item's planning was reviewed before step 1.

1. **Start** (orchestrator or author). `atelier start <id>` records the
   item's work branch and starts it. An item with a recorded branch switches
   to it; otherwise, on the base it creates a branch named `<id>`, and on any
   other branch, such as one made with `git switch -c <id>` or a worktree's,
   it takes that branch. Children share their parent's branch. The start
   record is committed with the first commit on the branch.
2. **Implement** (author), committing code and records together.
3. **Finish the record** (author). Tick each Done when line (`- [x]`) once
   it holds, and write the item's `## Report` (see
   [Report](tracker-records.md#report)).
4. **Ask for review** (orchestrator). `atelier review request <id>` prints
   the brief for an independent reviewer and writes nothing; naming the
   owner covers its started children too. It refuses while any line is
   unticked or the Report is empty, since asking means the work is
   implemented and every line holds, to the best of the author's knowledge.
   The brief leaves out the author's notes and Report, so whoever briefs the
   reviewer adds the proof that ran.
5. **Fix and re-review** (reviewer, author, orchestrator). The reviewer
   records each finding and, when none that must be fixed is open, its
   approval: `atelier review finding|approve <id> --identity <reviewer>`,
   committed on the work branch with the brief's `--commit-records`. The
   author fixes each `fix_now` finding in a later commit, and the
   orchestrator gets the fix reviewed; that re-review may cover only the
   fix's diff and may be by the same reviewer. The approval after the fix
   resolves the finding; it needs no disposition. The accountable agent (the
   reviewer, when that agent wrote the work) sets one with `atelier review
   disposition` for a finding deferred or dismissed instead, and for one recommended `defer` or `no_action` even if it was
   fixed (`defer` names an existing follow-up). A non-trivial record change
   after approval, such as a rewritten Done when line, gets a fresh approval
   too.
6. **Merge** (orchestrator). `atelier merge <id>` (try `--check` first)
   needs a current approval recorded after every `fix_now` finding left
   without a disposition, the dispositions step 5 calls for, and the merge
   checks passing. It makes one merge commit, which marks the owner and
   every open child done, started or not (so move out or supersede what
   should not merge), deletes the local work branch, and does not push. Work
   items have no close step.

Run `atelier land` before every handoff. On a work branch it reports what is
open and refuses nothing; on the base it refuses uncommitted records and
commits that change more than records and linked strategies without a
review or trivial exemption. Push afterwards as repository policy says, only
when land exited zero (never behind a pipe, which hides its status).

## What Makes an Approval Stale

Only a change to code: anything outside `.atelier/issues`, `.atelier/reviews`
and `.atelier/evidence` since the approved commit, not counting a clean merge
of the base. The workflow policy, config and strategy files count as code
here, so a strategy edit on a work branch makes it stale. Record edits never
make an approval stale: ticking lines, notes, links, the Report, status
changes, findings and dispositions. That is Atelier's gate, not a waiver
(step 5), and the review brief and `merge --check` show any Done when
changed after start.

A base that moved on needs no catch-up: `merge` builds the merged tree
itself, and the merge checks or CI test it where the repository has them.
Merge the base in only when the
branch is next to merge and it conflicts, a merge check fails on the merged
tree, or merge refuses with `merge_base_records` (an in-flight item's
records changed on the base, so leave those alone); `atelier merge
<id> --sync` does that and reports whether the approval survived. A merge
that resolves code by hand needs that resolution reviewed. Never rebase a
branch after review is recorded: findings and approvals pin its commits.

## Records

- Use `atelier issue create|show|update|transition|note|link|unlink`, with
  typed `--body` Markdown under [Tracker Records](tracker-records.md)'
  headings.
- Atelier refuses an invalid record when it is written, naming each problem.
  A finding or other review record may be corrected or deleted until it
  reaches the base; an approval or trivial exemption stays as first
  committed, so record a new one instead.
- Parent fields hold an increment's direct children (one level deep);
  `advances` links hold mission scope; `blocked_by` holds dependencies;
  labels hold themes. Missions are never parents. Set a mission's strategy
  with `--strategy <path>`.
- `atelier issue transition <id>` with no transition lists the valid ones and
  their blockers. Keep planned but not near-term work in `backlog` (`--status
  backlog`, or the `defer` transition, unrelated to a finding's DEFER; `plan`
  brings it back). A mission moves from `draft` to `todo` with `ready`, once
  it meets [Ready Missions](../procedures/plan.md#ready-missions).
- A choice that meets the [record test](tracker-records.md#decision) is a
  `decision` record, which the `decide` transition (`--reason "<the
  choice>"`) marks done once its Decision section is filled in; an open one
  waits for the human. Smaller choices are
  [decision notes](tracker-records.md#decision-notes) (`issue note <id>
  --kind decision "<choice>" --reason "<why>"`).
- Retire obsolete work with `supersede` and a reason. File work found along
  the way with `issue create --discovered-from <item, finding or receipt>`.
  Append handoffs with `issue note`. Run `bundle preview <file>` before
  `bundle apply`.
- `--commit-records` commits the records a command wrote (`--stage-records`
  groups several commands into one commit).

## Loose Ends

Work that changes no code and can only happen after a merge or a release,
such as pushing a tag, a play-test on a device, an eval run or a look at the
deployed service, is a **loose end**, unless it is an independent
validation of a mission or increment, which is a
[validation item](tracker-records.md#validation-item). A loose end is its
own issue (`atelier issue create --issue-type loose_end`), linked to the
issue it waits on with `atelier issue link <loose-end> <issue> --role
blocked_by`, which is stored on the loose end. File it when you plan the
item, or as soon as such work turns up (an implementer reports it to
whoever owns the plan): on the work branch while the item is in flight,
otherwise on the base. Filing one is reviewed with the item it follows, or
as a planning change once that item merged. It is never another issue's
child and never advances a mission, so it never holds one open. Whatever
part of it can run before merge, such as an emulator test, stays a Done when
line of the item.

A loose end takes no branch, review or merge. Once what it waits on is
merged, do it on the base, tick its line if it held, and mark it done with
a one-line result either way: `atelier issue transition <id> done --reason "<result>"`, then
commit the record on the base. A bad result files a linked bug (`--discovered-from <loose-end>`);
merged work is never reopened.

## A Change With No Issue

A release, a docs change or a mockup can skip the issue (the light path):
commit it on a branch no issue owns, run `atelier review request` there with
no ID, have the reviewer record `atelier review finding|approve --branch
<name>`, and run `atelier merge` with no ID. The same approval and merge
checks apply; nothing is marked done. File a release's tag as a loose end on
the release branch with no blocker, so it reaches the base with the merge.

## Planning on the Base

Commits that touch only records and the strategy files linked from missions
(filing, grooming, decisions, strategy edits, marking loose ends done) may go
on the base directly. So may the commit that installs Atelier, and one
commit whose correctness is evident from its diff, such as a typo fix,
exempted with `atelier review trivial --base <commit>` where repository
policy allows it. Everything else goes through a branch and `atelier
merge`. A non-trivial planning change is still reviewed before the work it
defines starts (see [Independent Review](../SKILL.md#independent-review));
the result that marks a loose end or validation done is an observation and
needs no review. Brief the reviewer with the planning commits, and record
the result with `atelier review approve` or `finding` against the issue, the
mission (for a strategy), or the decision. Record the human's plan approval
with `atelier review approve <mission> --identity <the human>`.

## Evidence

A receipt is an optional note for proof nothing else records: a manual,
browser, device or deployed observation, a mission criterion, a
measurement, or a failure such as a test that fails before its fix. No gate
reads receipts. Suites, formatting and lint that CI or the merge checks run
need none, and nothing is recorded again after a fix or a base merge; the
Report names the targeted test that proves each claim.

- `atelier evidence record --target <id> --kind <kind>` with a summary and
  `--result`, or with a command after `--`, which pins HEAD and takes the
  result from its exit status (it refuses uncommitted code).
- A receipt that judges mission success criteria names each one:
  `--criterion pipe-safe=pass`, or a bare `--criterion <slug>` that takes a
  captured command's result. Target the mission, or an item only that
  mission holds, such as its validation item. `atelier work mission <id>`
  marks each criterion proven, failing or unproven from the newest receipt.
- `atelier evidence list <id>` shows an item's receipts and their freshness.

## Orienting and Administration

- Start a session with `atelier status`. `atelier work ready`, `blocked`,
  `active`, `all`, `missions`, `mission <id>` and `parent <id>`, and
  `atelier issue show <id>`, give focused views. Work labelled `needs-human`
  and open decisions are the human's (`atelier work human`); do not start
  them. Records are branch-local: use Git history for past state.
- Walk the human through a mission with `atelier brief <mission> --html`
  before work starts and `atelier debrief <mission> --html` after it: link
  the printed page, and record their direction as review records, decisions,
  notes and issues.
- `atelier init` installs Atelier; `atelier setup claude` installs hooks
  that run `status` and `land`; `atelier doctor` judges every done item and
  the whole review history; `atelier prune --apply` removes old records.
- Atelier merges only into the policy's base branch (see
  [Atelier Limits](branches-and-worktrees.md#atelier-limits)).
