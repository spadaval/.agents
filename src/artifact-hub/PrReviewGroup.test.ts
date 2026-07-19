import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/svelte";
import { afterEach, describe, expect, it } from "vitest";
import type { ArtifactRecord } from "./catalog";
import PrReviewGroup from "./PrReviewGroup.svelte";
import type { PrGroup } from "./pr-groups";
import type { PrCatalogSummary } from "./pr-summary-api";

afterEach(cleanup);

const record = (id: string, head: string): ArtifactRecord => ({
  artifact: {
    valid: true,
    manifestPath: `/artifacts/${id}/manifest.json`,
    directoryName: id,
    href: `/artifacts/${id}/`,
    manifest: {
      manifestVersion: 1,
      id,
      title: `Review ${id}`,
      description: `${id} perspective`,
      createdAt: "2026-07-14T12:00:00Z",
      entry: "index.html",
      kind: "pr-review",
    },
  },
  kind: "pr-review",
  project: "project",
  sourceUrl: "https://github.example/owner/project/pull/42",
  imported: false,
  source: { pr: 42, head },
  searchText: `review ${id}`,
});

const summary: PrCatalogSummary = {
  schemaVersion: 1,
  repository: "owner/project",
  pr: {
    additions: 2,
    baseRefName: "main",
    baseRepository: "owner/project",
    changedFiles: 3,
    comments: 0,
    deletions: 1,
    headRefName: "feature",
    headRefOid: "bbbbbbbbbbbb",
    headRepository: "owner/project",
    isDraft: false,
    number: 42,
    reviewComments: 0,
    state: "OPEN",
    title: "Improve review grouping",
    updatedAt: "2026-07-14T12:00:00Z",
    url: "https://github.example/owner/project/pull/42",
  },
};

const group: PrGroup = {
  id: "pr-group:github.example/owner/project#42",
  identity: {
    key: "github.example/owner/project#42",
    host: "github.example",
    repository: "owner/project",
    number: 42,
  },
  project: "project",
  records: [record("current", "bbbbbbbbbbbb"), record("older", "aaaaaaaaaaaa")],
  summary,
  freshness: "live",
};

describe("PR review collection", () => {
  it("renders peer artifacts with revision status and no inferred primary", () => {
    render(PrReviewGroup, {
      group,
      matchingIds: new Set(["current", "older"]),
      relativeTime: () => "now",
    });

    const collection = screen.getByRole("region", {
      name: /project pr #42 review collection/i,
    });
    expect(within(collection).getByText("2 review artifacts")).toBeTruthy();
    expect(within(collection).getByText("Current head bbbbbbbb")).toBeTruthy();
    expect(within(collection).getByText("Earlier head aaaaaaaa")).toBeTruthy();
    expect(screen.getByRole("link", { name: /review current/i })).toBeTruthy();
    expect(screen.getByRole("link", { name: /review older/i })).toBeTruthy();
    expect(screen.queryByText(/primary/i)).toBeNull();
  });

  it("collapses and expands the artifact list", async () => {
    render(PrReviewGroup, {
      group,
      matchingIds: new Set(["current", "older"]),
      relativeTime: () => "now",
    });

    await fireEvent.click(screen.getByRole("button", { name: "Collapse" }));
    expect(screen.queryByRole("link", { name: /review current/i })).toBeNull();
    await fireEvent.click(screen.getByRole("button", { name: "Expand" }));
    expect(screen.getByRole("link", { name: /review current/i })).toBeTruthy();
  });
});
