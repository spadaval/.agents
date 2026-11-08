#!/usr/bin/env bash
# Atelier repository modelled on atelier-hwxm. A feature-flag store keeps a
# temporary read path for its old v1 format, which a backlog item removes once
# the last v1 deployment migrates with the 2026-11-10 release. A reviewer found
# a low, narrow hole on that path and recommended defer; the follow-up is
# started, and its branch closes the hole with a hash-chained ledger: a new
# module, a CLI command, docs and nine tests, about 200 added lines. The
# ledger also misses the finding's own case (verify skips the last entry).
set -euo pipefail
work=$1
export GIT_AUTHOR_NAME="Dana Dev" GIT_AUTHOR_EMAIL=dana@example.com
export GIT_COMMITTER_NAME="Dana Dev" GIT_COMMITTER_EMAIL=dana@example.com
export PYTHONDONTWRITEBYTECODE=1
here=$(cd "$(dirname "$0")" && pwd)
git init -q -b main "$work/repo"
cd "$work/repo"
cat > AGENTS.md <<'MD'
# Agent guide

Feature flags for the shop's deployments. Tests: `python3 -m unittest`.
This repository tracks work in Atelier (`atelier status` to orient).
Integrate work branches with `atelier merge`.
MD
printf '__pycache__/\n' > .gitignore
printf 'ana\nkai\n' > approvers.txt
cp "$here/files/base/flags.py" "$here/files/base/flagctl.py" "$here/files/base/test_flags.py" .
mkdir docs && cp "$here/files/base/docs/flags.md" docs/
python3 -m unittest -q 2>/dev/null
git add . && git commit -qm "Store flags in flags.json with an append-only history"
atelier init --slug flags -q >/dev/null
git add . && git commit -qm "Install Atelier"

reviewer="Riley Reviewer (review agent)"
remove=$(atelier issue create -q --status backlog --issue-type task "Remove the v1 flags.d read path" --body '## Goal
Delete the v1 read path (`is_v1`, `load_v1`, `v1_events`, the v1 branch of `set_flag`) and `migrate` once no deployment is on v1, so the store has one format.

## Done when
- [ ] `flags.py` has no v1 code, `flagctl.py` has no `migrate`, and the v1 tests are gone; the suite passes.

## Context
Pick up after the last v1 deployment (staging-eu) migrates, planned for the 2026-11-10 release.')
compat=$(atelier issue create -q --issue-type feature "Keep v1 deployments working on the new binary" --body '## Goal
Deployments still on the v1 `flags.d` layout keep working on the new binary until they run `flagctl.py migrate`, which folds their events into `flags.json`.

## Done when
- [ ] `load`, `set_flag` and `check_prod` read and write a v1 `flags.d`, and `migrate` folds it into `flags.json` with every event as history; tests show v1 and migrated give the same `check_prod`.

## Context
Temporary: '"$remove"' removes this path once every deployment has migrated.')
git add . && git commit -qm "File $remove and $compat"
atelier start "$compat" >/dev/null
cp "$here/files/main/flags.py" "$here/files/main/flagctl.py" "$here/files/main/test_flags.py" .
cp "$here/files/main/docs/flags.md" docs/
git commit -qam "Read and migrate v1 flags.d deployments ($compat)"
python3 - "$compat" <<'PY'
import sys
p = f".atelier/issues/{sys.argv[1]}.md"
s = open(p).read().replace("- [ ] `load`", "- [x] `load`")
s = s.rstrip() + "\n\n## Report\n\nDone when holds: `test_v1_and_migrated_agree`, `test_migrate_keeps_history_and_removes_flags_d` and `test_latest_event_wins` pass; `python3 -m unittest`: 6 tests pass.\n"
open(p, "w").write(s)
PY
git commit -qam "Report $compat"
atelier review finding "$compat" --identity "$reviewer" --recommendation defer --commit-records -q \
  "low: flags.py load_v1. Deleting a flag's latest event file in flags.d by hand makes its earlier event current, with the earlier value and setter: a flag an approver turned off comes back on, still attributed to that approver, and check_prod passes. v2 refuses the same edit, since history must end with the current value. So an unmigrated deployment is weaker than a migrated one. It needs a deliberate hand deletion in flags.d on a v1 deployment, and staging-eu is the only one. Possible fix: record v1 events in a ledger that load verifies, or say in docs/flags.md that v1 deployments lack this check until they migrate." >/dev/null
f0=$(ls -t .atelier/reviews/*.md | head -1 | xargs basename | sed 's/\.md$//')
atelier review approve "$compat" --identity "$reviewer" --commit-records -q "Meets Done when; one low finding, recommended defer." >/dev/null
fix=$(atelier issue create -q --issue-type bug --discovered-from "$f0" "A v1 deployment refuses the hand edits v2 refuses" --body '## Goal
Close finding '"$f0"': on a v1 deployment, deleting, changing or adding an event file in `flags.d` by hand must be refused, as v2 refuses a hand edit of `flags.json`.

## Done when
- [ ] On a v1 deployment, a deleted, changed or hand-added event file makes `load`, `check_prod` and `migrate` refuse; tests cover each case and the suite passes.

## Context
Finding '"$f0"' on '"$compat"'. '"$remove"' removes the v1 path once every deployment has migrated.')
git add .atelier && git commit -qm "File $fix"
atelier review disposition "$f0" --identity "Orchestrator" --decision defer --follow-up "$fix" --commit-records -q "Real gap; filed as $fix." >/dev/null
atelier merge "$compat" >/dev/null
git add .atelier && git commit -qm "Plan $fix" >/dev/null 2>&1 || true

atelier start "$fix" >/dev/null
cp "$here/files/fix/v1ledger.py" "$here/files/fix/flags.py" .
git add v1ledger.py && git commit -qam "Chain v1 event files in a ledger that load verifies ($fix)"
cp "$here/files/fix/flagctl.py" "$here/files/fix/test_flags.py" .
cp "$here/files/fix/docs/flags.md" docs/
git commit -qam "Add ledger verify and rebuild, docs and tests ($fix)"
python3 -m unittest -q 2>/dev/null
python3 - "$fix" <<'PY'
import sys
p = f".atelier/issues/{sys.argv[1]}.md"
s = open(p).read().replace("- [ ] On a v1", "- [x] On a v1")
s = s.rstrip() + """

## Report

Done when holds: `LedgerTest` covers a deleted (`test_a_deleted_event_is_refused`), changed and hand-added event file, a broken chain, and `migrate` refusing a tampered deployment; `python3 -m unittest`: 15 tests pass. `v1ledger.py` chains each v1 event file's hash in `flags.d/.ledger`; `load`, `set_flag` and `migrate` verify it. A deployment with no ledger is read as before until `flagctl.py ledger rebuild`, which trusts its files once. Docs: docs/flags.md, "The v1 ledger".
"""
open(p, "w").write(s)
PY
git commit -qam "Report $fix"

# Grader inputs, outside the repository.
echo "$fix" > "$work/.issue_id"
git symbolic-ref --short HEAD > "$work/.branch"
git rev-parse HEAD > "$work/.branch_head"
git rev-parse main > "$work/.main_head"
