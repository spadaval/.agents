import { execFileSync } from "node:child_process";
import {
  chmodSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";

const skill = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const generator = join(
  skill,
  "assets",
  "template",
  "scripts",
  "generate-diagrams.sh",
);

function fixture(version = "v0.7.1") {
  const root = mkdtempSync(join(tmpdir(), "d2-generator-"));
  const source = join(root, "src", "assets", "diagrams");
  mkdirSync(source, { recursive: true });
  writeFileSync(join(source, "architecture.d2"), "a -> b\n");
  writeFileSync(join(source, "_theme.d2"), "classes: {}\n");

  const log = join(root, "d2.log");
  const fake = join(root, "d2");
  writeFileSync(
    fake,
    `#!/usr/bin/env bash
set -euo pipefail
if [[ "\$1" == "version" ]]; then echo "${version}"; exit 0; fi
echo "\$*" >> "\$FAKE_D2_LOG"
if [[ "\$1" == "--layout" ]]; then
  printf '<svg xmlns="http://www.w3.org/2000/svg"></svg>\\n' > "\$4"
fi
`,
  );
  chmodSync(fake, 0o755);
  return { root, source, log, fake };
}

test("formats, validates, and renders authoritative D2 sources with ELK", () => {
  const current = fixture();
  try {
    execFileSync("bash", [generator], {
      env: {
        ...process.env,
        D2_BIN: current.fake,
        DIAGRAM_SOURCE_DIR: current.source,
        FAKE_D2_LOG: current.log,
      },
    });
    const calls = readFileSync(current.log, "utf8");
    assert.match(calls, /^fmt .*architecture\.d2$/m);
    assert.match(calls, /^validate .*architecture\.d2$/m);
    assert.match(
      calls,
      /^--layout elk .*architecture\.d2 .*generated\/architecture\.svg$/m,
    );
    assert.doesNotMatch(calls, /_theme\.d2/);
  } finally {
    rmSync(current.root, { recursive: true, force: true });
  }
});

test("rejects an unpinned D2 version", () => {
  const current = fixture("v9.9.9");
  try {
    assert.throws(
      () =>
        execFileSync("bash", [generator], {
          env: {
            ...process.env,
            D2_BIN: current.fake,
            DIAGRAM_SOURCE_DIR: current.source,
            FAKE_D2_LOG: current.log,
          },
          stdio: "pipe",
        }),
      /Expected D2 v0\.7\.1, found v9\.9\.9/,
    );
  } finally {
    rmSync(current.root, { recursive: true, force: true });
  }
});

test("fails clearly when D2 is unavailable", () => {
  const current = fixture();
  try {
    assert.throws(
      () =>
        execFileSync("bash", [generator], {
          env: {
            ...process.env,
            D2_BIN: join(current.root, "missing-d2"),
            DIAGRAM_SOURCE_DIR: current.source,
          },
          stdio: "pipe",
        }),
      /D2 v0\.7\.1 is required/,
    );
  } finally {
    rmSync(current.root, { recursive: true, force: true });
  }
});
