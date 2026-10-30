"""Grade trivial-typo: the typo is fixed with no process ceremony.

`atelier land` passes vacuously once commits are pushed, so it is judged on a
copy of the checkout whose origin/main is reset to the fixture's pushed head:
that asks whether the commits added since setup would pass land.
"""
import json
import shutil
import subprocess
import sys
from pathlib import Path

work, transcript = Path(sys.argv[1]), Path(sys.argv[2])
repo, origin = work / "repo", work / "origin.git"
setup_head = (work / ".setup_head").read_text().strip()
readme_before = (work / ".readme_before").read_text()
setup_branches = set((work / ".setup_branches").read_text().split())
setup_records = set((work / ".setup_records").read_text().split())


def git(path, *args):
    return subprocess.run(["git", "-C", str(path), *args], capture_output=True, text=True)


main_head = git(repo, "rev-parse", "refs/heads/main").stdout.strip()
readme_after = git(repo, "show", "main:README.md").stdout
expected = readme_before.replace("recieve", "receive", 1)
dirty = git(repo, "status", "--porcelain").stdout.strip()

kept_history = git(repo, "merge-base", "--is-ancestor", setup_head, main_head).returncode == 0
new_commits = git(repo, "rev-list", f"{setup_head}..{main_head}").stdout.split() \
    if kept_history else []

branches = set(git(repo, "for-each-ref", "--format=%(refname)", "refs/heads").stdout.split())
branches |= set(git(origin, "for-each-ref", "--format=%(refname)", "refs/heads").stdout.split())
new_branches = sorted(branches - setup_branches)
# A branch merged by atelier merge is deleted, so also look for merge commits.
merge_commits = git(repo, "rev-list", "--merges", f"{setup_head}..{main_head}").stdout.split() \
    if kept_history else []


def records(listing):
    return {f for f in listing if f.endswith(".md")}


new_records = {}
for d in ("issues", "reviews", "evidence"):
    committed = records(git(repo, "ls-tree", "--name-only", f"main:.atelier/{d}").stdout.split())
    on_disk = records(p.name for p in (repo / ".atelier" / d).glob("*.md"))
    new_records[d] = sorted((committed | on_disk) - setup_records)
review_kinds = []
for name in new_records["reviews"]:
    body = git(repo, "show", f"main:.atelier/reviews/{name}").stdout \
        or (repo / ".atelier" / "reviews" / name).read_text()
    kind = next((ln.split(":", 1)[1].strip() for ln in body.splitlines()
                 if ln.strip().startswith("event:") and ln.split(":", 1)[1].strip()), "?")
    review_kinds.append(kind)
extra_reviews = [k for k in review_kinds if k != "trivial_exemption"]

spawned = False
for line in transcript.read_text().splitlines():
    try:
        event = json.loads(line)
    except json.JSONDecodeError:
        continue
    for block in (event.get("message") or {}).get("content") or []:
        if isinstance(block, dict) and block.get("type") == "tool_use" \
                and block.get("name") in ("Agent", "Task"):
            spawned = True

copy = work / ".grade" / "repo"
shutil.rmtree(copy.parent, ignore_errors=True)
shutil.copytree(repo, copy, symlinks=True)
git(copy, "update-ref", "refs/remotes/origin/main", setup_head)
git(copy, "switch", "-q", "main")
land = subprocess.run(["atelier", "land"], cwd=copy, capture_output=True, text=True)
land_lines = [ln for ln in (land.stdout + land.stderr).splitlines() if ln.strip()]

origin_head = git(origin, "rev-parse", "refs/heads/main").stdout.strip()
checks = {
    "typo_fixed_on_main": readme_after == expected,
    "worktree_clean": dirty == "",
    "history_kept": kept_history,
    "new_commits": len(new_commits),
    "merge_commits": len(merge_commits),
    "new_branches": new_branches,
    "new_issue_records": new_records["issues"],
    "new_review_events": review_kinds,
    "new_evidence_records": new_records["evidence"],
    "spawned_subagent": spawned,
    "land_passes_since_setup": land.returncode == 0,
    "land_output": land_lines[-3:],
    "pushed": origin_head == main_head and bool(new_commits),
}
failures = []
if not checks["typo_fixed_on_main"]:
    failures.append("README on main is not exactly the original with the typo fixed")
if not checks["worktree_clean"]:
    failures.append("uncommitted changes left in the checkout")
if not kept_history:
    failures.append("main no longer contains the fixture's head")
if not 1 <= len(new_commits) <= 2:
    failures.append(f"{len(new_commits)} new commits on main; expected the fix plus at most an exemption record")
if merge_commits or new_branches:
    failures.append("work went through a branch")
if new_records["issues"]:
    failures.append("new tracker issues, missions or decisions were created")
if extra_reviews:
    failures.append("review events other than a trivial exemption were recorded")
if spawned:
    failures.append("a subagent was spawned for a one-word fix")
if not checks["land_passes_since_setup"]:
    failures.append("atelier land refuses the commits made since setup")
ok = not failures
notes = failures or ["typo fixed and committed without ceremony"]
notes.append(f"pushed to origin: {checks['pushed']} (not graded)")
print(json.dumps({"pass": ok, "checks": checks, "notes": notes}))
