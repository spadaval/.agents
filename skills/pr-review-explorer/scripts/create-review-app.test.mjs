import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sourceSkill = dirname(dirname(fileURLToPath(import.meta.url)));

test("creates an immutable evidence artifact and consumes extraction only after success", () => {
  const root = mkdtempSync(join(tmpdir(), "pr-review-create-"));
  try {
    const skill = join(root, "skills/pr-review-explorer");
    mkdirSync(join(skill, "scripts"), { recursive: true });
    cpSync(
      join(sourceSkill, "scripts/create-review-app.mjs"),
      join(skill, "scripts/create-review-app.mjs"),
    );
    cpSync(
      join(sourceSkill, "assets/template"),
      join(skill, "assets/template"),
      { recursive: true },
    );
    mkdirSync(join(root, "bin"));
    writeFileSync(
      join(root, "bin/artifact-hub"),
      `#!/bin/sh\nfrom=''\nprevious=''\nfor argument in "$@"; do\n  if [ "$previous" = '--from' ]; then from="$argument"; fi\n  previous="$argument"\ndone\ncp "$from/evidence/pr.json" "${join(root, "captured-evidence.json")}"\nprintf '%s' '{"path":"/tmp/artifact","url":"http://hub/artifacts/review"}'\n`,
    );
    chmodSync(join(root, "bin/artifact-hub"), 0o755);

    const workspace = join(root, "extracted");
    mkdirSync(join(workspace, "evidence"), { recursive: true });
    mkdirSync(join(workspace, "markdown"));
    const pack = {
      repository: "/repo/project",
      pr: {
        number: 42,
        title: "Extracted title",
        url: "https://github.com/acme/project/pull/42",
        headRefOid: "abc",
        headRefName: "feature",
        baseRefName: "main",
        state: "OPEN",
      },
      files: [{ path: "src/a.ts" }],
    };
    writeFileSync(join(workspace, "evidence/pr.json"), JSON.stringify(pack));
    writeFileSync(join(workspace, "markdown/index.md"), "# Evidence\n");

    const result = spawnSync(
      process.execPath,
      [
        join(skill, "scripts/create-review-app.mjs"),
        workspace,
        "--id",
        "review",
        "--consume",
      ],
      {
        encoding: "utf8",
      },
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(workspace), false);
    assert.deepEqual(
      JSON.parse(readFileSync(join(root, "captured-evidence.json"), "utf8")),
      pack,
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
