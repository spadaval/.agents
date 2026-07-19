import { describe, expect, it } from "vitest";
import type { ArtifactRecord } from "./catalog";
import { groupPrRecords } from "./pr-groups";
import type { PrCatalogSnapshot, PrCatalogSummary } from "./pr-summary-api";
import { inferPrStacks } from "./pr-stacks";

const record = (id: string, pr: number): ArtifactRecord => ({
  artifact: {
    valid: true,
    manifestPath: `/artifacts/${id}/manifest.json`,
    directoryName: id,
    href: `/artifacts/${id}/`,
    manifest: {
      manifestVersion: 1,
      id,
      title: `PR #${pr}`,
      createdAt: `2026-07-14T${String(pr % 24).padStart(2, "0")}:00:00Z`,
      entry: "index.html",
      kind: "pr-review",
    },
  },
  kind: "pr-review",
  project: "project",
  imported: false,
  source: { pr },
  searchText: `pr ${pr}`,
});

const summary = (
  pr: number,
  head: string,
  base: string,
  state = "OPEN",
): PrCatalogSummary => ({
  schemaVersion: 1,
  repository: "owner/project",
  pr: {
    additions: 1,
    baseRefName: base,
    baseRepository: "owner/project",
    changedFiles: 1,
    comments: 0,
    deletions: 1,
    headRefName: head,
    headRepository: "owner/project",
    isDraft: false,
    number: pr,
    reviewComments: 0,
    state,
    title: `PR ${pr}`,
    updatedAt: "2026-07-14T12:00:00Z",
    url: `https://github.example/owner/project/pull/${pr}`,
  },
});

const snapshot = (
  values: Record<string, PrCatalogSummary>,
): PrCatalogSnapshot => ({
  schemaVersion: 1,
  generatedAt: "2026-07-14T12:00:00Z",
  freshness: "live",
  summaries: values,
  errors: {},
});

const resolve = (records: ArtifactRecord[], value: PrCatalogSnapshot) => {
  const grouping = groupPrRecords(records, value);
  return { grouping, result: inferPrStacks(grouping.groups, value) };
};

describe("PR stack inference", () => {
  it("orders a live chain from root to tip and excludes closed ancestors", () => {
    const records = [
      record("pr-474", 474),
      record("pr-486", 486),
      record("pr-487", 487),
      record("pr-475", 475),
    ];
    const value = snapshot({
      "pr-474": summary(474, "service", "develop", "CLOSED"),
      "pr-486": summary(486, "runbook", "service"),
      "pr-487": summary(487, "syslog", "runbook"),
      "pr-475": summary(475, "validation", "syslog"),
    });
    const { grouping, result } = resolve(records, value);
    expect(result.stacks).toHaveLength(1);
    expect(
      result.stacks[0].groups.map((group) => group.identity?.number),
    ).toEqual([486, 487, 475]);
    expect(
      result.memberToStack.has(grouping.recordToGroup.get("pr-474")!),
    ).toBe(false);
  });

  it("refuses an edge with multiple eligible parents", () => {
    const records = [
      record("parent-a", 1),
      record("parent-b", 2),
      record("child", 3),
    ];
    const value = snapshot({
      "parent-a": summary(1, "shared", "main"),
      "parent-b": summary(2, "shared", "main"),
      child: summary(3, "tip", "shared"),
    });
    const { grouping, result } = resolve(records, value);
    expect(result.stacks).toHaveLength(0);
    expect(result.ambiguous.has(grouping.recordToGroup.get("child")!)).toBe(
      true,
    );
  });

  it("keeps same-named refs in different repositories separate", () => {
    const records = [record("parent", 1), record("child", 2)];
    const parent = summary(1, "feature", "main");
    parent.pr.headRepository = "fork/project";
    const value = snapshot({
      parent,
      child: summary(2, "tip", "feature"),
    });
    const { result } = resolve(records, value);
    expect(result.stacks).toHaveLength(0);
  });

  it("keeps identical repository coordinates on different hosts separate", () => {
    const records = [record("parent", 1), record("child", 2)];
    const parent = summary(1, "feature", "main");
    parent.pr.url = "https://github-one.example/owner/project/pull/1";
    const child = summary(2, "tip", "feature");
    child.pr.url = "https://github-two.example/owner/project/pull/2";
    const value = snapshot({ parent, child });
    const { result } = resolve(records, value);

    expect(result.stacks).toHaveLength(0);
  });

  it("rejects cycles instead of publishing an unstable order", () => {
    const records = [record("one", 1), record("two", 2)];
    const value = snapshot({
      one: summary(1, "one", "two"),
      two: summary(2, "two", "one"),
    });
    const { grouping, result } = resolve(records, value);
    expect(result.stacks).toHaveLength(0);
    expect(result.ambiguous).toEqual(
      new Set([
        grouping.recordToGroup.get("one"),
        grouping.recordToGroup.get("two"),
      ]),
    );
  });

  it("treats several artifacts for one PR as one stack node", () => {
    const records = [
      record("parent-a", 10),
      record("parent-b", 10),
      record("child", 11),
    ];
    const value = snapshot({
      "parent-a": summary(10, "feature", "main"),
      "parent-b": summary(10, "feature", "main"),
      child: summary(11, "tip", "feature"),
    });
    const { result } = resolve(records, value);

    expect(result.ambiguous).toEqual(new Set());
    expect(result.stacks).toHaveLength(1);
    expect(result.stacks[0].groups).toHaveLength(2);
    expect(result.stacks[0].groups[0].records).toHaveLength(2);
  });
});
