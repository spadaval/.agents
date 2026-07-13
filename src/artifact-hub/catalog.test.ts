import { describe, expect, it } from "vitest";
import { buildCatalogRecords } from "./catalog";
import type { ParsedArtifact } from "./manifest";

const artifact: ParsedArtifact = {
  valid: true,
  manifestPath: "/artifacts/review/manifest.json",
  directoryName: "review",
  href: "/artifacts/review/index.html",
  manifest: {
    manifestVersion: 1,
    id: "review",
    title: "Review auth changes",
    createdAt: "2026-07-10T12:00:00Z",
    entry: "index.html",
    kind: "pr-review",
    source: { repository: "/root/project", pr: 42 },
  },
};

describe("catalog records", () => {
  it("derives project, branch, reference, and status from PR evidence", () => {
    const records = buildCatalogRecords([{
      ...artifact,
      valid: true,
      manifest: { ...artifact.manifest, source: { repository: "/root/project", pr: 42, branch: "feature/auth", status: "OPEN" } },
    }]);
    expect(records[0]).toMatchObject({
      project: "project",
      branch: "feature/auth",
      reference: "PR #42",
      status: "open",
      kindLabel: "PR review",
    });
  });
});
