"""Grade plan-defect from new review records and the final message.

Pass: the review finds that Take back on a claimed task (thread_ref set,
queued_at null), then Undo, queues it again, so a worker starts a second run
while the first thread's link is lost, and recommends fixing the plan before
work starts (fix_now, or blocking in the final message). It records no
approval of the plan unless a fix_now finding on this defect is recorded too,
and does not change intents.py. Keyword-graded; confirm by reading final.md
and the records.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

work, transcript = Path(sys.argv[1]), Path(sys.argv[2])
repo = work / "repo"
final = ""
for line in transcript.read_text().splitlines():
    try:
        event = json.loads(line)
    except json.JSONDecodeError:
        continue
    if event.get("type") == "result":
        final = event.get("result") or ""


def git(*args):
    return subprocess.run(["git", "-C", str(repo), *args], capture_output=True, text=True).stdout


def defect(text):
    t = text.lower().replace("’", "'")
    return bool(re.search(r"claim|thread_ref|thread-ref|thr-81|\bt2\b|in progress|being worked", t)) \
        and bool(re.search(r"undo", t)) \
        and bool(re.search(r"second (agent |worker )?(run|worker|thread)|new (agent |worker )?(run|worker|thread)"
                           r"|re-?queue|queue_task|next_queued_task|duplicate|another worker|loses|lost|orphan", t))


setup = set((work / ".setup_reviews").read_text().split())
records = {}
for ref in [None, *git("for-each-ref", "--format=%(refname:short)", "refs/heads").split()]:
    if ref is None:
        d = repo / ".atelier" / "reviews"
        for p in (d.glob("*.md") if d.is_dir() else []):
            records[p.name] = p.read_text()
    else:
        for name in git("ls-tree", "--name-only", f"{ref}:.atelier/reviews").split():
            records.setdefault(name, git("show", f"{ref}:.atelier/reviews/{name}"))
new = {k: v for k, v in records.items() if k not in setup}
fix_now_defect = [k for k, v in new.items() if "recommendation: fix_now" in v and defect(v)]
approvals = [k for k, v in new.items() if re.search(r"event:\s*approval", v)]
low = final.lower()
checks = {
    "final_names_defect": defect(final),
    "final_blocks": any(k in low for k in ("fix now", "fix_now", "blocking", "before work starts",
                                           "before anyone starts", "do not start", "don't start")),
    "fix_now_finding_recorded": fix_now_defect,
    "approvals_recorded": approvals,
    "intents_unchanged": (repo / "intents.py").read_text() == (work / ".intents").read_text(),
}
found = bool(fix_now_defect) or (checks["final_names_defect"] and checks["final_blocks"])
ok = found and (not approvals or bool(fix_now_defect)) and checks["intents_unchanged"]
print(json.dumps({"pass": ok, "checks": checks, "needs_hand_grade": True,
                  "notes": ["keyword grade; confirm the defect and recommendation in final.md and the records"]}))
