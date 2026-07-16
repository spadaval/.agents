import { cleanup, render, screen, within } from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { ArtifactRecord } from "../catalog";
import type { PrCatalogSummary } from "../pr-summary-api";
import PrReviewArtifactRow from "./PrReviewArtifactRow.svelte";

afterEach(cleanup);

const record: ArtifactRecord = {
  artifact: {
    valid: true,
    manifestPath: "/artifacts/review/manifest.json",
    directoryName: "review",
    href: "/artifacts/review/",
    manifest: {
      manifestVersion: 1,
      id: "review",
      title: "Review auth changes",
      createdAt: "2026-07-14T12:00:00Z",
      entry: "index.html",
      kind: "pr-review",
    },
  },
  kind: "pr-review",
  project: "project",
  sourceUrl: "https://github.example/owner/project/pull/42",
  imported: false,
  source: { pr: 42 },
  searchText: "review auth changes",
};

const summary: PrCatalogSummary = {
  schemaVersion: 1,
  repository: "owner/project",
  pr: {
    additions: 12,
    baseRefName: "main",
    baseRepository: "owner/project",
    changedFiles: 3,
    comments: 2,
    deletions: 4,
    headRefName: "feature/auth",
    headRepository: "owner/project",
    isDraft: false,
    number: 42,
    reviewComments: 1,
    reviewDecision: "APPROVED",
    state: "OPEN",
    title: "Review auth changes",
    updatedAt: "2026-07-14T12:00:00Z",
    url: "https://github.example/owner/project/pull/42",
  },
};

describe("PR review artifact row", () => {
  it("groups GitHub metadata beside a separate outbound PR link", () => {
    render(PrReviewArtifactRow, {
      record,
      prSummary: summary,
      relativeTime: () => "now",
    });

    const cluster = screen.getByLabelText("GitHub pull request data");
    expect(within(cluster).getByText("PR #42")).toBeTruthy();
    expect(within(cluster).getByText("Approved")).toBeTruthy();
    expect(within(cluster).getByText("3 comments")).toBeTruthy();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0].getAttribute("href")).toBe("/artifacts/review/");
    expect(
      screen
        .getByRole("link", { name: /open pr #42 on github/i })
        .getAttribute("href"),
    ).toBe("https://github.example/owner/project/pull/42");
  });

  it("uses the manifest PR URL when live GitHub data is unavailable", () => {
    render(PrReviewArtifactRow, {
      record,
      relativeTime: () => "now",
    });

    expect(screen.getByText("PR #42")).toBeTruthy();
    expect(
      screen
        .getByRole("link", { name: /open pr #42 on github/i })
        .getAttribute("href"),
    ).toBe(record.sourceUrl);
  });
});
