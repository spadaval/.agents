import { describe, expect, it } from "vitest";
import type { ArtifactRecord } from "./catalog";
import type { PrCatalogSummary } from "./pr-summary-api";
import { prArtifactStaleness } from "./pr-artifact-staleness";

const record = (head?: string): ArtifactRecord => ({
  artifact: {
    valid: true,
    manifestPath: "/artifacts/review/manifest.json",
    directoryName: "review",
    href: "/artifacts/review/",
    manifest: {
      manifestVersion: 1,
      id: "review",
      title: "PR #42",
      createdAt: "2026-07-14T12:00:00Z",
      entry: "index.html",
      kind: "pr-review",
    },
  },
  kind: "pr-review",
  project: "project",
  imported: false,
  source: head ? { pr: 42, head } : { pr: 42 },
  searchText: "pr 42",
});

const summary = (headRefOid?: string) =>
  ({ pr: { headRefOid } }) as PrCatalogSummary;

describe("PR review artifact staleness", () => {
  it("marks an artifact stale when the live PR head has advanced", () => {
    expect(
      prArtifactStaleness(record("old-head"), summary("new-head")),
    ).toEqual({
      stale: true,
      recordedHead: "old-head",
      currentHead: "new-head",
    });
  });

  it("keeps an artifact current when its recorded head still matches", () => {
    expect(
      prArtifactStaleness(record("same-head"), summary("same-head")),
    ).toMatchObject({ stale: false });
  });

  it("does not guess when either head is unavailable", () => {
    expect(prArtifactStaleness(record(), summary("current"))).toEqual({
      stale: false,
      recordedHead: undefined,
      currentHead: "current",
    });
    expect(prArtifactStaleness(record("recorded"))).toEqual({
      stale: false,
      recordedHead: "recorded",
      currentHead: undefined,
    });
  });
});
