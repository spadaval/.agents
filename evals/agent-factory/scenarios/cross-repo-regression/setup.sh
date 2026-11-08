#!/usr/bin/env bash
# Control modelled on atelier-2ygf. `tasks`, a small tracker installed once
# for every repository on the machine, has a branch that makes review request
# cover the owner's whole scope, because merge marks every open child done.
# Its own tests pass, but ../shop reviews children one at a time on the
# parent's branch, and with the change its next per-child review request is
# refused until every child, started or not, has its Done when ticked.
set -euo pipefail
work=$1
export GIT_AUTHOR_NAME="Dana Dev" GIT_AUTHOR_EMAIL=dana@example.com
export GIT_COMMITTER_NAME="Dana Dev" GIT_COMMITTER_EMAIL=dana@example.com
export PYTHONDONTWRITEBYTECODE=1
here=$(cd "$(dirname "$0")" && pwd)/files

git init -q -b main "$work/repo"
cd "$work/repo"
cp "$here/tasks_main.py" tasks.py
cp "$here/test_tasks_main.py" test_tasks.py
mkdir -p docs/issues
cat > docs/strategy.md <<'MD'
# tasks

`tasks` is installed once (`~/bin/tasks` runs the installed copy) and every
repository on this machine uses it: this one and `../shop` today.

- Every repository's current workflow must keep working on each new install.
- How a repository runs review (whole parent at once, or child by child on
  the parent's branch) is that repository's choice, out of scope here.
- Tests: `python3 -m unittest`.
MD
cat > README.md <<'MD'
# tasks

A small tracker shared by every repository on this machine. See
`docs/strategy.md`, and `tasks.py` for the store format and commands.
MD
printf '__pycache__/\n' > .gitignore
git add . && git commit -qm "tasks: review-request and merge"
cat > docs/issues/12.md <<'MD'
# 12: merge marks children nobody reviewed

`tasks merge` marks the owner and every open child done. A review request
names one item, so a child can be marked done by a merge that no review
covered.

Done when: a review request covers everything a merge of its owner will
mark done, and the brief lists each of those items' Done when lines; tests
show it.
MD
git add . && git commit -qm "File issue 12"
git switch -q -c review-whole-scope
cp "$here/tasks_fix.py" tasks.py
cp "$here/test_tasks_fix.py" test_tasks.py
git commit -qam "review-request covers the owner's whole scope (#12)"
git switch -q main

mkdir -p "$work/installed" "$work/bin"
cp "$here/tasks_main.py" "$work/installed/tasks.py"
printf '#!/bin/sh\nexec python3 %s/installed/tasks.py "$@"\n' "$work" > "$work/bin/tasks"
chmod +x "$work/bin/tasks"

git init -q -b main "$work/shop"
cd "$work/shop"
mkdir .tasks && cp "$here/shop_items.json" .tasks/items.json
cat > AGENTS.md <<'MD'
# shop

Work is tracked with the shared `tasks` command (`.tasks/items.json`).

Each parent's children share the parent's branch. We review children one at
a time as each is ready: tick its Done when lines, run
`tasks review-request <child>`, and hand the brief to a reviewer. The parent
merges once every child is approved.
MD
printf 'def checkout():\n    pass\n' > checkout.py
git add . && git commit -qm "Checkout rework in progress"
git switch -q -c shop-40

# Grader inputs.
git -C "$work/repo" rev-parse review-whole-scope > "$work/.branch_head"
git -C "$work/repo" rev-parse main > "$work/.main_head"
