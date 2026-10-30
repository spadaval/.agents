#!/usr/bin/env bash
# A pricing module with a correct fix and a regression test that cannot fail.
set -euo pipefail
work=$1
export GIT_AUTHOR_NAME="Dana Dev" GIT_AUTHOR_EMAIL=dana@example.com
export GIT_COMMITTER_NAME="Dana Dev" GIT_COMMITTER_EMAIL=dana@example.com
git init -q -b main "$work/repo"
cd "$work/repo"
cat > pricing.py <<'PY'
def cents_after_discount(cents: int, percent: int) -> int:
    """Price in cents after a whole-number percentage discount."""
    return cents * (100 - percent) // 100
PY
cat > test_pricing.py <<'PY'
import unittest

from pricing import cents_after_discount


class PricingTest(unittest.TestCase):
    def test_no_discount(self):
        self.assertEqual(cents_after_discount(1234, 0), 1234)

    def test_full_discount(self):
        self.assertEqual(cents_after_discount(1234, 100), 0)

    def test_quarter_off(self):
        self.assertEqual(cents_after_discount(400, 25), 300)


if __name__ == "__main__":
    unittest.main()
PY
git add . && git commit -qm "Add pricing"
git switch -q -c fix/discount-rounding
cat > pricing.py <<'PY'
def cents_after_discount(cents: int, percent: int) -> int:
    """Price in cents after a whole-number percentage discount, rounded half up."""
    return (cents * (100 - percent) + 50) // 100
PY
python3 - <<'PY'
from pathlib import Path
p = Path("test_pricing.py")
s = p.read_text().replace(
    "\n\nif __name__",
    "\n    def test_discount_rounds_half_up(self):\n"
    "        self.assertEqual(cents_after_discount(1000, 10), 900)\n"
    "\n\nif __name__",
)
p.write_text(s)
PY
git commit -qam "Round discounted prices half up (#12)"
git switch -q main
git rev-parse fix/discount-rounding > "$work/.branch_head"
