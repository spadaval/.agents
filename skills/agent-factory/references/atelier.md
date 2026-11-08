# Atelier

Atelier is Agent Factory's tracker. `atelier --help` lists one issue's steps in
order, `atelier <command> --help` each command's record sections, flags and
rules, and `atelier issue transition <id>` an item's transitions; a refusal
names what is missing.

## Words

Tracker words mean only this: **check** is `atelier check`, the merge checks or
`merge --check`; **review** is independent review, or the human's of a mission's
plan (`atelier brief`) and merged work (`atelier debrief`); **land** is
`atelier land`; **done** is the terminal status of merged work, of a loose end,
validation or decision finished on the base, and of a closed mission;
**declined** is that of real work that will not be done (`decline`, with a
Report saying why and no branch, review or merge); only a mission **closes**
([orchestrate](../procedures/orchestrate.md#closing-a-mission)).

## One Issue, in Order

The steps are `atelier --help`'s; this says who takes each. An author working
alone takes the orchestrator's too.

1. **Start** (orchestrator or author): `atelier start <id>`. Children share
   their parent's branch.
2. **Implement** (author), committing code and records together.
3. **Finish the record** (author): tick each Done when line once it holds and
   write the `## Report` ([implement](../procedures/implement.md#handoff)).
4. **Request review** (orchestrator): give the reviewer the brief
   `atelier review request <id>` prints, adding the proof that ran (commands and
   results) and any constraint it lacks, such as the item's Scope. The reviewer
   records its findings with the commands the brief prints.
5. **Fix and re-review** (author, then a reviewer): the author fixes each
   `fix_now` finding that stands in a later commit, and a reviewer reviews the
   fix. Each other finding gets a disposition from whoever [Independent
   Review](../SKILL.md#independent-review) says: `defer` (with a follow-up),
   `wont_fix` (real, not worth fixing, no follow-up) or `no_action` (wrong).
   `review defer <id>` defers all its undecided findings recommended defer.
6. **Approve** (reviewer), with the command the brief prints.
7. **Merge** (orchestrator): `atelier merge <id>` also marks every open child
   done, started or not, so move out or supersede any that should not merge.
   Never use plain `git merge`, which runs no gate and marks nothing done.

A change that needs no issue, such as small work, a release, docs or a mockup,
takes the light path that `atelier --help` and `review approve --help`
(`--branch`) describe instead, with the same gates and nothing marked done.

Push only when `atelier land` exits zero (`land --push` does that), never behind
a pipe that hides its status. Once it does, push without asking: whether work
goes out was decided at review and merge, and land refuses unreviewed code on
the base. Stop only if land refuses, or a commit holds secrets or personal
details.

## What Makes an Approval Stale

A code change since the approved commit, as `atelier --help` says. Code is
anything outside `.atelier/issues`, `.atelier/reviews` and `.atelier/evidence`:
policy, config and strategy files count (a strategy edit on the base is still
planning), and a clean merge of the base does not.

A base that moved on needs no catch-up: merge it in (`merge --sync`) only when
the branch is next to merge and conflicts, a merge check fails on the merged
tree, or merge refuses and says to. Never rebase after review is recorded, since
reviews pin commits.

## Planning on the Base

Commits that touch only records and the strategy files missions link go on the
base directly, so every branch sees the plan; a started item's own record
changes only on its work branch. A non-trivial planning commit is reviewed
before the work it defines starts: brief the reviewer with the planning commits
(`review request` is for finished work), and it records `review approve` or
`finding` against the issue, the mission (for a strategy) or the decision.
Everything else goes through a branch and `atelier merge`, except a trivial
commit exempted with `review trivial --base` where policy allows, and the result
that marks a loose end or validation done, which needs no review (below).

## Records

A choice is a decision record when it is costly to reverse, reaches beyond its
item, changes a public or persisted contract, or needs the human. Other choices
are decision notes on their item (`atelier issue note --kind decision`), written
where a later reader would ask "why is it like this?". A changed decision gets a
new record that supersedes the old one. Label work only a human can do
`needs-human`; agents leave it, and open decisions, to the human.

## Loose Ends and Validation Items

`atelier --help` says what a loose end is. File it
(`issue create --issue-type loose_end`, then `issue link <loose-end> <issue>
--role blocked_by`) when you plan the item, or as soon as such work turns up, on
the base as a planning change reviewed like any other, even while the issue it
waits on is in flight. The link lives on the loose end; whoever owns the plan
rewrites or drops the Done when line it replaces, on the work branch. A
release's tag, with no issue to wait on, is filed on the release branch instead.
A loose end never advances a mission, so it never holds one open.

A validation item, which holds an independent `validate` assignment and advances
its mission, is needed for mission acceptance, an increment that changes a
user-facing or cross-boundary outcome, or where choosing what to test needs an
independent eye; otherwise author-run proof suffices. Both kinds are done on the
base with no branch, review or merge: once what they wait on has merged, do the
work, mark the item done with a one-line result (`atelier issue transition <id>
done --reason "<result>"`) and commit the record. A bad result files a linked
bug; merged work is never reopened.
