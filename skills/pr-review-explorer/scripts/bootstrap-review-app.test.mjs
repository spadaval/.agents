import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
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

function setup() {
  const root = mkdtempSync(join(tmpdir(), "pr-review-bootstrap-"));
  const skill = join(root, "skills/pr-review-explorer");
  mkdirSync(join(skill, "scripts"), { recursive: true });
  cpSync(
    join(sourceSkill, "scripts/bootstrap-review-app.mjs"),
    join(skill, "scripts/bootstrap-review-app.mjs"),
  );
  cpSync(join(sourceSkill, "assets/template"), join(skill, "assets/template"), {
    recursive: true,
  });
  mkdirSync(join(root, "bin"));
  writeFileSync(
    join(root, "bin/gh"),
    `#!/bin/sh\nprintf '%s\\n' "$@" > "${join(root, "gh-args.txt")}"\nprintf '%s' '{"number":42,"title":"A title from GitHub","url":"https://cto-github.cisco.com/acme/project/pull/42","baseRefName":"main","headRefName":"feature","headRefOid":"abc","state":"OPEN"}'\n`,
  );
  writeFileSync(
    join(root, "bin/artifact-hub"),
    `#!/bin/sh\nfrom=''\nprevious=''\nfor argument in "$@"; do\n  if [ "$previous" = '--from' ]; then from="$argument"; fi\n  previous="$argument"\ndone\ncp "$from/runtime/source.json" "${join(root, "captured-source.json")}"\nprintf '%s' '{"path":"/tmp/artifact","url":"http://hub/artifacts/review"}'\n`,
  );
  chmodSync(join(root, "bin/gh"), 0o755);
  chmodSync(join(root, "bin/artifact-hub"), 0o755);
  return root;
}

test("infers PR from the current branch and records the authenticated proxy contract", () => {
  const root = setup();
  try {
    const script = join(
      root,
      "skills/pr-review-explorer/scripts/bootstrap-review-app.mjs",
    );
    const result = spawnSync(
      process.execPath,
      [script, "--repo", root, "--id", "review/a"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${join(root, "bin")}:${process.env.PATH}`,
        },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    const ghArgs = readFileSync(join(root, "gh-args.txt"), "utf8")
      .trim()
      .split("\n");
    assert.deepEqual(ghArgs.slice(0, 3), ["pr", "view", "--json"]);
    const source = JSON.parse(
      readFileSync(join(root, "captured-source.json"), "utf8"),
    );
    assert.deepEqual(source, {
      repository: "https://cto-github.cisco.com/acme/project",
      url: "https://cto-github.cisco.com/acme/project/pull/42",
      pr: 42,
      endpoint: "/api/pr-review/review%2Fa",
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("passes an explicit PR override to gh", () => {
  const root = setup();
  try {
    const script = join(
      root,
      "skills/pr-review-explorer/scripts/bootstrap-review-app.mjs",
    );
    const result = spawnSync(
      process.execPath,
      [script, "--repo", root, "--id", "review", "--pr", "99"],
      {
        encoding: "utf8",
        env: {
          ...process.env,
          PATH: `${join(root, "bin")}:${process.env.PATH}`,
        },
      },
    );
    assert.equal(result.status, 0, result.stderr);
    const ghArgs = readFileSync(join(root, "gh-args.txt"), "utf8")
      .trim()
      .split("\n");
    assert.deepEqual(ghArgs.slice(0, 4), ["pr", "view", "99", "--json"]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
