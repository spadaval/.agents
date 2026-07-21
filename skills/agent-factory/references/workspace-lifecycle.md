# Workspace Lifecycle

Use repository and harness policy to isolate mutating work without imposing one
Git workflow on every environment.

## Start

1. Inspect the current branch, dirty state, repository instructions, and native
   workspace facilities.
2. Preserve unrelated changes. Reuse an already isolated workspace when it owns
   the assignment.
3. Prefer the harness's native workspace or worktree support. Use manual Git
   worktrees only when policy permits and no native owner exists.
4. Run the smallest representative baseline check before editing. Classify a
   failing baseline as pre-existing, environment/tooling, or assignment-blocking;
   do not attribute it to the new work later.

## During Work

Keep one accountable owner for the branch or workspace. Record commits,
integration dependencies, expected temporary breakage, and derived local state.
Do not make private workspace state the only home of decisions or proof.

## Close

Run fresh assignment proof and the repository-required integration checks.
Report branch, commits, dirty state, untracked files, residual breakage, and the
valid next action: integrate, open review, retain for follow-up, or discard.
Never merge, delete, or discard a workspace merely because implementation is
finished; follow repository policy and the human's authority for that action.
