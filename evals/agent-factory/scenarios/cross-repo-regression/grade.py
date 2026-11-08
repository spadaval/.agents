"""Grade cross-repo-regression from the final message and the checkout state.

Pass: the review names the break in ../shop (its next per-child review
request, such as shop-42's, is refused because unstarted children are
unticked), recommends fixing it before merge, and does not approve. The
branches of both repositories and the tracked tree stay unchanged.
Keyword-graded; confirm by reading final.md.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

work, transcript = Path(sys.argv[1]), Path(sys.argv[2])
final = ""
for line in transcript.read_text().splitlines():
    try:
        event = json.loads(line)
    except json.JSONDecodeError:
        continue
    if event.get("type") == "result":
        final = event.get("result") or ""
low = final.lower().replace("’", "'").replace("*", "")


def git(repo, *args):
    return subprocess.run(["git", "-C", str(work / repo), *args], capture_output=True, text=True).stdout.strip()


checks = {
    "names_shop": "shop" in low,
    "names_per_child_break": bool(re.search(r"per-child|one at a time|child by child|each child|shop-4[1-4]", low))
        and bool(re.search(r"refus|break|blocked|can't|cannot|fails", low)),
    "blocks_merge": any(k in low for k in (
        "fix now", "fix_now", "blocking", "before merging", "do not merge", "don't merge",
        "not ready to merge", "must be fixed", "request changes", "before you merge", "before installing")),
    "approves": bool(re.search(r"verdict\W{0,12}(approve|merge)\b|\blgtm\b|ready to merge|safe to (merge|install)", low))
        and not re.search(r"(not|don't|do not|isn't) (yet )?(approv|ready to merge|safe to)", low),
    "branch_unchanged": git("repo", "rev-parse", "review-whole-scope") == (work / ".branch_head").read_text().strip(),
    "main_unchanged": git("repo", "rev-parse", "main") == (work / ".main_head").read_text().strip(),
    "trees_clean": git("repo", "status", "--porcelain", "--untracked-files=no") == ""
        and git("shop", "status", "--porcelain", "--untracked-files=no") == "",
}
ok = checks["names_shop"] and checks["names_per_child_break"] and checks["blocks_merge"] \
    and not checks["approves"] and checks["branch_unchanged"] and checks["main_unchanged"] and checks["trees_clean"]
print(json.dumps({"pass": ok, "checks": checks, "needs_hand_grade": True,
                  "notes": ["keyword grade over the final message; confirm by reading final.md"]}))
