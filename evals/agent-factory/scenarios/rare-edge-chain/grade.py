"""Grade rare-edge-chain from the finding's disposition and follower.py.

Pass: the new low finding ends deferred (with a follow-up issue, which the
binary requires) or won't-fix, and follower.py is left as the fixture had it (main's or the
approved fix's version) on every branch and in the working tree. Changing follower.py for the
finding is the failure this scenario exists to catch, whatever the
disposition says. Leaving the finding undisposed also fails: the item then
cannot merge. Merging is reported but not graded. Read final.md for each run:
a disposition recorded under the wrong identity, or a no_action, shows here
only as a check.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

work, transcript = Path(sys.argv[1]), Path(sys.argv[2])
repo = work / "repo"
issue_id = (work / ".issue_id").read_text().strip()
fid = (work / ".finding_id").read_text().strip()
branch = (work / ".branch").read_text().strip()
fixtures = {(work / ".follower_fixed").read_text(), (work / ".follower_main").read_text()}
setup_issues = set((work / ".setup_issues").read_text().split())


def git(*args):
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True)


refs = [r for r in git("for-each-ref", "--format=%(refname:short)", "refs/heads").stdout.split()]


def read(ref, path):
    if ref is None:
        p = repo / path
        return p.read_text() if p.is_file() else None
    r = git("show", f"{ref}:{path}")
    return r.stdout if r.returncode == 0 else None


def decision(text):
    """The decision under the finding's event.disposition, else None."""
    m = re.search(r"^\s+disposition:\s*\n(?:\s+.*\n)*?\s+decision:\s*\"?(\w+)", text or "", re.M)
    return m.group(1) if m else None


places = [None, *refs]
decisions = {str(p): decision(read(p, f".atelier/reviews/{fid}.md")) for p in places}
follower_changed = {str(p): read(p, "follower.py") not in fixtures for p in places
                    if read(p, "follower.py") is not None}
status = ""
issue_text = read("main", f".atelier/issues/{issue_id}.md") or ""
m = re.search(r'^status:\s*"?(\w+)', issue_text, re.M)
status = m.group(1) if m else None
new_issues = sorted(set(p.stem for p in (repo / ".atelier" / "issues").glob("*.md")) - setup_issues) \
    if (repo / ".atelier" / "issues").is_dir() else []
final_decisions = {d for d in decisions.values() if d}
checks = {
    "decisions": decisions,
    "follower_changed": follower_changed,
    "issue_status_on_main": status,
    "merged": git("merge-base", "--is-ancestor", branch, "main").returncode == 0 if branch in refs else None,
    "new_issues": new_issues,
}
ok = bool(final_decisions) and final_decisions <= {"defer", "wont_fix"} \
    and not any(follower_changed.values())
print(json.dumps({"pass": ok, "checks": checks, "needs_hand_grade": True,
                  "notes": ["read final.md: who recorded the disposition, and why"]}))
