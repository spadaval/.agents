---
name: rebase
description: Instructions for performing git rebases safely and efficiently
---

If a branch has diverged from the main branch, there are two options to update the branch with the latest changes from main: merging or rebasing.

The first thing to do is identify if a rebase is even the right option.
Merging is a better choice if the history is important. This is usually true if the branch is long-lived and shared by multiple people.
However, if all we care about is the code, rebase is the better choice.


## Workflow

First, identify the base branch to rebase onto. This is usually `main` or `master`, but the user may specify a different branch.
(if the target is unclear, ask!)
 

Check if there is a rebase ongoing.

```bash
git rebase --show-current-patch
```

If not, start one:

```bash
git fetch origin {target_branch}
git rebase origin/{target_branch}
```

Then, start working through the rebase.

```bash
git rebase --continue
``` 

For any non-trivial rebase, there will be conflicts. 
Conflicts are indicated by `git status`, and by conflict markers in the files themselves.

There are two types of conflicts: "mechanistic" and "real" conflicts.
Mechanistic conflicts are ones where the desired goal is clear, but git's algorithms are not smart enough to figure it out. 

Attempt to figure out what the desired result should be. 
Start with the `git status` output.
Then, read the file with conflict markers.
Also reference commit history (and messages).
Going further back and reading old version of the file can be useful.
Finally, you can also search the codebase for references or common patterns. 

If it is clear what the desired result should be, perform the edit and stage the file. 

In some cases, there may be tradeoffs or actually conflicting changes.
If there is ambiguity, ask the user for guidance before performing the edit and staging the file.

When doing this, present this information to the user:
1. The {target_branch} changes
2. The current branch changes
3. Options for how to resolve the conflict, including tradeoffs if applicable

For efficiency, first resolve mechanistic conflicts and then batch together all real conflicts for each commit. 

Once all conflicts are resolved, the rebase can continue. 

```bash
git rebase --continue
```

Once all changes are rebased, the branch's history will have been rewritten.
At this point, the branch needs to be force pushed to the remote, since the history has changed.
Stop for a final confirmation, then push the changes:

```bash
git push --force-with-lease
```


## Notes

- The `--force-with-lease` flag is safer than `--force` as it won't overwrite remote changes you haven't seen
