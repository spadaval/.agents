import { describe, expect, it } from "vitest";
import {
  normalizeReviewDecision,
  reviewDecisionBadge,
} from "./pr-review-decision";

describe("GitHub review decisions", () => {
  it.each([
    ["APPROVED", "approved", "Approved"],
    ["CHANGES_REQUESTED", "changes-requested", "Changes requested"],
    ["REVIEW_REQUIRED", "review-required", "Review required"],
    ["", "none", "No approval decision"],
  ])("maps %s to a catalog badge", (decision, kind, label) => {
    expect(reviewDecisionBadge(normalizeReviewDecision(decision))).toEqual({
      kind,
      label,
    });
  });

  it("does not invent a status for missing or unknown decisions", () => {
    expect(normalizeReviewDecision(undefined)).toBeUndefined();
    expect(normalizeReviewDecision("PENDING_REVIEWERS")).toBeUndefined();
    expect(reviewDecisionBadge(undefined)).toBeUndefined();
  });
});
