import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const planSkill = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reviewSkill = resolve(planSkill, "..", "pr-review-explorer");

const pairs = [
  [
    join(planSkill, "assets/template/src/lib/DiagramViewer.svelte"),
    join(
      reviewSkill,
      "assets/template/src/review/primitives/DiagramViewer.svelte",
    ),
  ],
  [
    join(planSkill, "assets/template/src/lib/DiagramViewer.test.ts"),
    join(
      reviewSkill,
      "assets/template/src/review/primitives/DiagramViewer.test.ts",
    ),
  ],
  [
    join(planSkill, "assets/template/scripts/generate-diagrams.sh"),
    join(reviewSkill, "assets/template/scripts/generate-diagrams.sh"),
  ],
];

test("plan and review templates share the same diagram behavior", () => {
  for (const [planPath, reviewPath] of pairs) {
    assert.equal(
      readFileSync(planPath, "utf8"),
      readFileSync(reviewPath, "utf8"),
      `${planPath} differs from ${reviewPath}`,
    );
  }
});
