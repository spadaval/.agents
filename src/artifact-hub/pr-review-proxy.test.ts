import { describe, expect, it } from "vitest";
import {
  associateDiffs,
  splitUnifiedDiff,
  unifiedDiffPath,
} from "./pr-review-proxy";

describe("PR review runtime proxy", () => {
  it("splits a combined patch into complete file patches", () => {
    const patch = [
      "diff --git a/a.ts b/a.ts",
      "--- a/a.ts",
      "+++ b/a.ts",
      "@@ -1 +1 @@",
      "-old",
      "+new",
      "diff --git a/b.ts b/b.ts",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/b.ts",
      "@@ -0,0 +1 @@",
      "+created",
      "",
    ].join("\n");

    expect(splitUnifiedDiff(patch)).toEqual([
      [
        "diff --git a/a.ts b/a.ts",
        "--- a/a.ts",
        "+++ b/a.ts",
        "@@ -1 +1 @@",
        "-old",
        "+new",
      ].join("\n"),
      [
        "diff --git a/b.ts b/b.ts",
        "new file mode 100644",
        "--- /dev/null",
        "+++ b/b.ts",
        "@@ -0,0 +1 @@",
        "+created",
      ].join("\n"),
    ]);
  });

  it("returns no chunks for an empty patch", () => {
    expect(splitUnifiedDiff("")).toEqual([]);
  });

  it("associates independently ordered metadata and patches by exact path", () => {
    const chunks = splitUnifiedDiff(
      [
        "diff --git a/b.ts b/b.ts\n--- a/b.ts\n+++ b/b.ts\n@@ -1 +1 @@\n-old\n+new",
        "diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n-old\n+new",
      ].join("\n"),
    );
    const files = [
      { filename: "a.ts", status: "modified", additions: 1, deletions: 1 },
      { filename: "b.ts", status: "modified", additions: 1, deletions: 1 },
    ];

    const associated = associateDiffs(files, chunks);

    expect(associated.get("a.ts")?.split("\n")[0]).toContain("a/a.ts b/a.ts");
    expect(associated.get("b.ts")?.split("\n")[0]).toContain("a/b.ts b/b.ts");
  });

  it("parses deleted, spaced, and Git-quoted UTF-8 paths", () => {
    expect(
      unifiedDiffPath(
        "diff --git a/deleted.ts b/deleted.ts\n--- a/deleted.ts\n+++ /dev/null",
      ),
    ).toBe("deleted.ts");
    expect(
      unifiedDiffPath(
        "diff --git a/a b.ts b/a b.ts\n--- a/a b.ts\n+++ b/a b.ts",
      ),
    ).toBe("a b.ts");
    expect(
      unifiedDiffPath(
        'diff --git "a/caf\\303\\251.ts" "b/caf\\303\\251.ts"\n--- "a/caf\\303\\251.ts"\n+++ "b/caf\\303\\251.ts"',
      ),
    ).toBe("café.ts");
  });

  it("fails visibly when metadata and patch paths differ", () => {
    expect(() =>
      associateDiffs(
        [
          {
            filename: "expected.ts",
            status: "modified",
            additions: 1,
            deletions: 1,
          },
        ],
        ["diff --git a/other.ts b/other.ts\n--- a/other.ts\n+++ b/other.ts"],
      ),
    ).toThrow(/missing: expected\.ts; unexpected: other\.ts/);
  });
});
