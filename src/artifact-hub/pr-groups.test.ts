import { describe, expect, it } from "vitest";
import type { ArtifactRecord } from "./catalog";
import { groupPrRecords, mergedPrArtifactIds, prIdentity } from "./pr-groups";
import type { PrCatalogSnapshot, PrCatalogSummary } from "./pr-summary-api";

const record = (
  id: string,
  repository = "https://github.example/owner/project",
  pr = 42,
  head = "aaaa",
): ArtifactRecord => ({
  artifact: {
    valid: true,
    manifestPath: `/artifacts/${id}/manifest.json`,
    directoryName: id,
    href: `/artifacts/${id}/`,
    manifest: {
      manifestVersion: 1,
      id,
      title: id,
      createdAt: `2026-07-14T12:00:0${id.length % 10}Z`,
      entry: "index.html",
      kind: "pr-review",
    },
  },
  kind: "pr-review",
  project: "project",
  repository,
  sourceUrl: `${repository}/pull/${pr}`,
  imported: false,
  source: { repository, url: `${repository}/pull/${pr}`, pr, head },
  searchText: id,
});

const summary = (pr = 42, state = "OPEN"): PrCatalogSummary => ({
  schemaVersion: 1,
  repository: "owner/project",
  pr: {
    additions: 1,
    baseRefName: "main",
    baseRepository: "owner/project",
    changedFiles: 1,
    comments: 0,
    deletions: 1,
    headRefName: "feature",
    headRefOid: "bbbb",
    headRepository: "owner/project",
    isDraft: false,
    number: pr,
    reviewComments: 0,
    state,
    title: "PR title",
    updatedAt: "2026-07-14T12:00:00Z",
    url: `https://github.example/owner/project/pull/${pr}`,
  },
});

const snapshot = (
  summaries: Record<string, PrCatalogSummary>,
): PrCatalogSnapshot => ({
  schemaVersion: 1,
  generatedAt: "2026-07-14T12:00:00Z",
  freshness: "live",
  summaries,
  errors: {},
});

describe("PR review grouping", () => {
  it("groups the same PR across live and manifest-only artifacts", () => {
    const records = [record("live", undefined, 42, "bbbb"), record("snapshot")];
    const result = groupPrRecords(records, snapshot({ live: summary() }));

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].identity).toMatchObject({
      host: "github.example",
      repository: "owner/project",
      number: 42,
    });
    expect(
      result.groups[0].records.map((item) => item.artifact.manifest.id),
    ).toEqual(["snapshot", "live"]);
  });

  it("keeps revisions together and exposes the live summary on the group", () => {
    const records = [
      record("old", undefined, 42, "aaaa"),
      record("current", undefined, 42, "bbbb"),
    ];
    const result = groupPrRecords(
      records,
      snapshot({ old: summary(), current: summary() }),
    );

    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].records).toHaveLength(2);
    expect(result.groups[0].summary?.pr.headRefOid).toBe("bbbb");
  });

  it("includes the GitHub host in identity", () => {
    const first = record("first", "https://github-one.example/owner/project");
    const second = record("second", "https://github-two.example/owner/project");

    expect(prIdentity(first)?.key).not.toBe(prIdentity(second)?.key);
    expect(groupPrRecords([first, second], null).groups).toHaveLength(2);
  });

  it("groups closed or unavailable PRs from manifest identity", () => {
    const records = [record("one"), record("two")];
    const value = snapshot({ one: summary(42, "CLOSED") });
    value.errors.two = "unavailable";

    const result = groupPrRecords(records, value);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].records).toHaveLength(2);
  });

  it("hides every artifact in a merged PR review collection", () => {
    const records = [
      record("live", undefined, 42, "bbbb"),
      record("snapshot", undefined, 42, "aaaa"),
      record("open", undefined, 43, "cccc"),
    ];
    const groups = groupPrRecords(
      records,
      snapshot({ live: summary(42, "MERGED"), open: summary(43, "OPEN") }),
    ).groups;

    expect([...mergedPrArtifactIds(groups)].sort()).toEqual([
      "live",
      "snapshot",
    ]);
  });

  it("uses an irreversible merged manifest snapshot when live data is unavailable", () => {
    const merged = record("merged");
    merged.status = "merged";

    expect([
      ...mergedPrArtifactIds(groupPrRecords([merged], null).groups),
    ]).toEqual(["merged"]);
  });

  it("leaves reviews without a strong PR identity standalone", () => {
    const one = record("one");
    const two = record("two");
    one.repository = undefined;
    one.sourceUrl = undefined;
    one.source = { pr: 42 };
    two.repository = undefined;
    two.sourceUrl = undefined;
    two.source = { pr: 42 };

    expect(groupPrRecords([one, two], null).groups).toHaveLength(2);
  });
});
