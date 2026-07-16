export type GitHubReviewDecision =
  "APPROVED" | "CHANGES_REQUESTED" | "REVIEW_REQUIRED" | "";

export type ReviewDecisionBadge = {
  kind: "approved" | "changes-requested" | "review-required" | "none";
  label: string;
};

export function normalizeReviewDecision(
  value: unknown,
): GitHubReviewDecision | undefined {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim().toUpperCase();
  if (normalized === "") return "";
  if (
    normalized === "APPROVED" ||
    normalized === "CHANGES_REQUESTED" ||
    normalized === "REVIEW_REQUIRED"
  ) {
    return normalized;
  }
  return undefined;
}

export function reviewDecisionBadge(
  decision: GitHubReviewDecision | undefined,
): ReviewDecisionBadge | undefined {
  switch (decision) {
    case "APPROVED":
      return { kind: "approved", label: "Approved" };
    case "CHANGES_REQUESTED":
      return { kind: "changes-requested", label: "Changes requested" };
    case "REVIEW_REQUIRED":
      return { kind: "review-required", label: "Review required" };
    case "":
      return { kind: "none", label: "No approval decision" };
    default:
      return undefined;
  }
}
