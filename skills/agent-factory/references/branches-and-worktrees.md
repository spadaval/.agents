# Branches and Worktrees

Use this reference when starting, integrating, or closing work that changes
files. The repository's and the harness's own conventions come first.

Branches and worktrees are cheap to create and expensive to leave behind.
Every one is state that a later agent or human must understand, reconcile, or
delete. Create as few as possible, and clean up after the work.

## Starting

1. Check the current branch, uncommitted changes, and repository
   instructions.
2. Preserve changes you did not make. Never discard or overwrite them.
3. Decide where to work using the rules below. Usually that is the current
   checkout or the branch you were assigned.
4. Run a small, representative baseline check. If it already fails, note
   whether the failure is pre-existing, an environment problem, or blocks the
   work, so it is not blamed on your change later.

## Branches

- **One branch per pull request, and PRs sized for review.** A PR usually
  covers an epic or another reviewable increment, not a single issue. Several
  issues share a branch when they will be reviewed and merged together.
- **At most one integration branch per mission,** and only when mission work
  must stay off the default branch until it is ready. Slice PRs target it. An
  isolated rewrite (see `migrate`) uses this branch.
- **No branch per retry or review fix.** Commit review fixes to the branch
  under review, and retry on the same branch. To throw away a pushed attempt,
  archive-tag its tip first (see below) and follow the repository's
  force-push policy.
- **Stack only for real dependencies.** Base a branch on another unmerged
  branch only when it genuinely needs that code, and go no more than two
  deep. Merge the base before stacking further.
- **Spikes** get one disposable branch each, deleted once their learning is
  recorded (see [Implementation Candidates](implementation-candidates.md)).
- **Naming:** follow the repository's convention. Otherwise use
  `agent/<issue>-<short-slug>`.

## Worktrees

- **Default to no new worktree.** Work in the current checkout, and sequence
  agents that would otherwise edit the same checkout.
- **Create one only when two agents must write at the same time** and their
  work cannot reasonably be sequenced. Never keep more worktrees than there
  are agents actively writing, plus the mission's scratch checkout if there
  is one.
- **Read-only work does not get its own worktree.** Reviewers, auditors, and
  diagnosticians investigating without instrumenting read branches with
  `git diff`, `git show`, and `git log`. Validators and others who must run
  code use the author's checkout while the author is idle, and leave it as
  they found it. If that is not possible, the orchestrator may keep one
  scratch checkout per mission, detached at the commit under test, reused by
  every read-only role, and removed at closeout. A diagnostician who
  instruments code or writes a fix is a writer.
- **Prefer the harness's native worktree support** over manual `git
  worktree add`. Put manual worktrees where repository policy says, or beside
  the repository with a name that matches the branch.

## Ownership and Cleanup

The agent accountable for the work owns the branches and worktrees created
for it. Under an orchestrator, that includes everything its assignees
created. The orchestrator names the branch in each assignment, and assignees
list anything else they created in their handoff. Working alone, you own what
you create. Record what was created in handoffs or the tracker, so ownership
survives a lost context.

Remove things once they are no longer needed: after the work merges, after a
spike's learning is recorded, or when the work is superseded. Do it as part
of finishing, not as a later chore.

You may do the following without asking, for branches and worktrees you own:

- Delete branches whose work is merged. Confirm this with `git branch
  --merged <target>` or the PR's merged state, since squash and rebase merges
  do not show as merged to Git. Never force-delete on inference.
- Remove worktrees that have no uncommitted changes.
- Archive a branch whose work is unmerged, such as a spike or a superseded
  attempt: tag it `archive/<branch-name>`, push the tag if the branch was
  pushed, then delete the branch. Archive tags are a safety net, not a record.
  The learning belongs in the tracker. At mission close, list the archive
  tags in the closeout handoff and delete them once the human confirms.

Ask first before deleting anything whose origin you cannot establish from
handoffs or tracker records, anything with uncommitted changes, or a branch
with an open PR. Close or retarget the PR first.

## Closing

Run the final proof and any integration checks the repository requires. Then
inventory what the work created, starting from handoffs and tracker records
and cross-checking with `git worktree list`, `git branch --list 'agent/*'`,
and the remote branches. The `agent/*` listing includes other missions' work.
Anything you cannot trace to this work is not yours to delete. Remove or
archive what is finished, and run `git worktree prune` to clear stale
entries.

Report the branch, commits, any uncommitted or untracked files, remaining
breakage, and every branch or worktree deliberately left behind, with the
reason and the next step.

Finishing the implementation is not permission to merge into the default
branch. Merges follow repository policy, the
[independent review](../SKILL.md#independent-review) rule, and the human's
direction.
