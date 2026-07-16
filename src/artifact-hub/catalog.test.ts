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
  it("normalizes universal and PR-specific snapshot fields", () => {
    const records = buildCatalogRecords([
      {
        ...artifact,
        valid: true,
        manifest: {
          ...artifact.manifest,
          source: {
            repository: "/root/project",
            pr: 42,
            branch: "feature/auth",
            status: "OPEN",
          },
        },
      },
    ]);
    expect(records[0]).toMatchObject({
      project: "project",
      branch: "feature/auth",
      reference: "PR #42",
      status: "open",
      kind: "pr-review",
      imported: false,
    });
  });

  it("marks legacy artifacts as imported without turning provenance into a type", () => {
    const records = buildCatalogRecords([
      {
        ...artifact,
        valid: true,
        manifest: {
          ...artifact.manifest,
          kind: "codex-reflect",
          source: {
            repository: "/root/project",
            producer: "codex-reflect",
            legacyWorkspace: "/root/old-report",
            primaryThreadId: "019f3d95-770f-7b40-9865-7f27e62e7d3d",
          },
        },
      },
    ]);
    expect(records[0]).toMatchObject({
      kind: "codex-reflect",
      imported: true,
      reference: "Session 019f3d95",
      producer: "codex-reflect",
    });
  });
});
