{{skill}}Please review branch `fix/discount-rounding` against `main` before I merge it. Don't change anything, just give me the review.

Requirement (issue #12): a price after a percentage discount must round half up to the nearest cent. It used to truncate, so 1001 cents at 50% off came out as 500 instead of 501.

Proof from the author: `python3 -m unittest` passes (4 tests). Their note says: "added test_discount_rounds_half_up; it failed before the fix and passes now."
