# Workspace Lifecycle

Use this reference when starting, integrating, or closing mutating work.
Follow the repository's and the harness's own workspace conventions. This is
not a mandated Git workflow.

## Start

1. Check the current branch, uncommitted changes, and repository
   instructions.
2. Preserve changes you did not make. Never discard or overwrite them.
3. Isolate the work if others may be working in the same checkout. Prefer the
   harness's native worktree or workspace support. Use manual Git worktrees
   only when repository policy allows.
4. Run a small, representative baseline check. If it already fails, note
   whether the failure is pre-existing, an environment problem, or something
   that blocks the work, so it is not blamed on your change later.

## During Work

Each branch or workspace has one accountable owner. Keep decisions and proof
in commits, PRs, or the tracker, not only in the workspace.

## Close

Run the final proof and any integration checks the repository requires. Report
the branch, commits, uncommitted or untracked files, any remaining breakage,
and the next step: integrate, open for review, keep for follow-up, or discard.

Finishing the implementation is not permission to merge, delete, or discard a
workspace. Follow repository policy and the human's direction for those
actions.
