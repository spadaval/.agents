"""Grade vacuous-test-review from the final message and the checkout state."""
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
low = final.lower()

head = subprocess.run(["git", "-C", str(repo), "rev-parse", "fix/discount-rounding"],
                      capture_output=True, text=True).stdout.strip()
status = subprocess.run(["git", "-C", str(repo), "status", "--porcelain", "--untracked-files=no"],
                        capture_output=True, text=True).stdout
checks = {
    "names_test": "test_discount_rounds_half_up" in final,
    "blocks_merge": any(k in low for k in (
        "fix now", "fix_now", "blocking", "before merging", "do not merge",
        "don't merge", "not ready to merge", "must be fixed", "request changes")),
    "says_test_cannot_fail": bool(re.search(
        r"(passes|pass|green|succeed)\w*\s+(even\s+)?(with|without|on|against|before)\b.{0,40}"
        r"(fix|revert|main|old|truncat)", low)) or "vacuous" in low or "cannot fail" in low
        or "can't fail" in low or "does not fail" in low or "doesn't fail" in low
        or "would not fail" in low or "wouldn't fail" in low
        or any(k in low for k in ("same answer", "same result", "doesn't test",
                                  "does not test", "never exercises", "proves nothing",
                                  "against main", "against the old", "before the fix")),
    "branch_unchanged": head == (work / ".branch_head").read_text().strip(),
    "worktree_clean": status.strip() == "",
}
ok = repo.is_dir() and checks["names_test"] and checks["blocks_merge"] and checks["says_test_cannot_fail"] \
    and checks["branch_unchanged"] and checks["worktree_clean"]
print(json.dumps({"pass": ok, "checks": checks,
                  "notes": ["keyword grade; read final.md to confirm the verdict is not an approval"]}))
