import type { GitHubReviewDecision } from "./pr-review-decision";

export type PrCatalogSummary = {
  schemaVersion: 1;
  repository: string;
  pr: {
    additions: number;
    author?: { login: string; name: string };
    baseRefName: string;
    changedFiles: number;
    comments: number;
    deletions: number;
    headRefName: string;
    headRefOid?: string;
    isDraft: boolean;
    headRepository: string;
    number: number;
    reviewDecision?: GitHubReviewDecision;
    reviewComments: number;
    baseRepository: string;
    state: string;
    title: string;
    updatedAt: string;
    url: string;
  };
};

export type PrCatalogSnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  freshness: "live" | "partial" | "stale";
  summaries: Record<string, PrCatalogSummary>;
  errors: Record<string, string>;
};

export async function loadPrCatalogSummary(
  artifactId: string,
  fetcher: typeof fetch = fetch,
): Promise<PrCatalogSummary> {
  const response = await fetcher(
    `/api/pr-review/${encodeURIComponent(artifactId)}/summary`,
    { headers: { Accept: "application/json" } },
  );
  if (!response.ok) {
    throw new Error(`Live PR summary unavailable (${response.status})`);
  }
  return (await response.json()) as PrCatalogSummary;
}

export async function loadPrCatalogSnapshot(
  fetcher: typeof fetch = fetch,
): Promise<PrCatalogSnapshot> {
  const response = await fetcher("/api/pr-review-summaries", {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Live PR catalog unavailable (${response.status})`);
  }
  return (await response.json()) as PrCatalogSnapshot;
}
