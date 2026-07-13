import { parsePatchFiles } from "@pierre/diffs";
import { describe, expect, it } from "vitest";
import { createPatchExcerpt } from "./patch";

const patch = `diff --git a/src/example.ts b/src/example.ts
index 1234567..7654321 100644
--- a/src/example.ts
+++ b/src/example.ts
@@ -10,5 +10,6 @@ function example() {
 unchanged
-old value
+new value
+another value
 tail
 unchanged too
`;

describe("createPatchExcerpt", () => {
  it("returns a Pierre-renderable patch for a new-file range", () => {
    const result = createPatchExcerpt(patch, "src/example.ts", "new", 11, 12);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const file = parsePatchFiles(result.patch)[0]?.files[0];
    expect(file?.name).toBe("src/example.ts");
    expect(result.patch).toContain("-old value\n+new value\n+another value");
  });

  it("selects old-file evidence while retaining its replacement", () => {
    const result = createPatchExcerpt(patch, "src/example.ts", "old", 11, 11);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.patch).toContain("-old value\n+new value\n+another value");
  });

  it("creates a valid patch from GitHub's headerless file patch", () => {
    const result = createPatchExcerpt(
      "@@ -1 +1 @@\n-old\n+new",
      "src/example.ts",
      "new",
      1,
      1,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(parsePatchFiles(result.patch)[0]?.files[0]?.name).toBe(
      "src/example.ts",
    );
  });

  it("does not expand an excerpt to an entire newly added file", () => {
    const additions = Array.from(
      { length: 100 },
      (_, index) => `+line ${index + 1}`,
    ).join("\n");
    const result = createPatchExcerpt(
      `@@ -0,0 +1,100 @@\n${additions}`,
      "src/new-file.ts",
      "new",
      40,
      45,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.patch).toContain("+line 38");
    expect(result.patch).toContain("+line 47");
    expect(result.patch).not.toContain("+line 1\n");
    expect(result.patch).not.toContain("+line 100");
  });

  it("fails visibly when any requested line is absent from the patch", () => {
    expect(
      createPatchExcerpt(patch, "src/example.ts", "new", 12, 15),
    ).toEqual({
      ok: false,
      message:
        "The fetched patch does not contain the complete new-file range 12–15. Missing line: 15.",
    });
  });

  it("does not treat the patch's trailing newline as evidence", () => {
    expect(
      createPatchExcerpt("@@ -1 +1 @@\n line\n", "example.ts", "new", 2, 2)
        .ok,
    ).toBe(false);
  });
});
