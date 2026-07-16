import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const here = dirname(fileURLToPath(import.meta.url));
const validator = resolve(
  here,
  "../assets/template/scripts/validate-review.ts",
);
const viteNode = resolve(here, "../../../node_modules/.bin/vite-node");
const artifacts = resolve(here, "../../../artifacts");
const cleanups = [];

test.afterEach(() => {
  while (cleanups.length)
    rmSync(cleanups.pop(), { recursive: true, force: true });
});

function fixture() {
  mkdirSync(artifacts, { recursive: true });
  const root = mkdtempSync(join(artifacts, "pr-review-validator-"));
  cleanups.push(root);
  mkdirSync(join(root, "src/review/layers"), { recursive: true });
  return root;
}

function entry(root, kind, name, metadata, markup = "") {
  const directory = join(root, `src/review/${kind}`);
  mkdirSync(directory, { recursive: true });
  const meta = { kind: kind === "layers" ? "layer" : "story", ...metadata };
  writeFileSync(
    join(directory, `${name}.svelte`),
    `<script module lang="ts">\nexport const meta = ${JSON.stringify(meta, null, 2)} as const;\n</script>\n${markup}\n`,
  );
}

function evidence(root, paths) {
  mkdirSync(join(root, "evidence"), { recursive: true });
  writeFileSync(
    join(root, "evidence/pr.json"),
    JSON.stringify({ files: paths.map((path) => ({ path })) }),
  );
}

function validate(root, env = {}) {
  return spawnSync(viteNode, [validator], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...env },
  });
}

test("accepts exact paths and intentional membership in multiple layers", () => {
  const root = fixture();
  evidence(root, ["src/a.ts", "src/b.ts"]);
  entry(root, "layers", "runtime", {
    id: "runtime",
    order: 10,
    title: "Runtime",
    summary: "Runtime changes.",
    files: ["src/a.ts", "src/b.ts"],
  });
  entry(
    root,
    "layers",
    "risk",
    {
      id: "risk",
      order: 20,
      title: "Risk",
      summary: "Risk changes.",
      files: ["src/a.ts"],
    },
    "<p>Shared evidence.</p>",
  );
  const result = validate(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /2 changed files; 2 layers; 0 stories; 0 findings/);
});

test("validates typed findings and their exact changed-file anchors", () => {
  const root = fixture();
  evidence(root, ["src/a.ts"]);
  entry(root, "layers", "runtime", {
    id: "runtime", title: "Runtime", summary: "Runtime changes.", files: ["src/a.ts"],
  });
  mkdirSync(join(root, "src/review/findings"));
  writeFileSync(
    join(root, "src/review/findings/bug.ts"),
    `export default { id: "bug", kind: "bug", severity: 2, title: "Broken", body: "It breaks.", reviewedHeadOid: "deadbeef", anchors: [{ path: "src/a.ts", side: "new", start: 2, end: 3 }] } as const;`,
  );
  const result = validate(root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /1 findings/);
});

test("reports unassigned and stale paths", () => {
  const root = fixture();
  evidence(root, ["src/a.ts", "src/unassigned.ts"]);
  entry(root, "layers", "runtime", {
    id: "runtime",
    order: 10,
    title: "Runtime",
    summary: "Runtime changes.",
    files: ["src/a.ts", "src/stale.ts"],
  });
  const result = validate(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /unassigned changed file: src\/unassigned\.ts/);
  assert.match(result.stderr, /stale mapped path: src\/stale\.ts/);
});

test("reports duplicate layer metadata, duplicate entries, empty layers, and multiple primary stories", () => {
  const root = fixture();
  evidence(root, ["src/a.ts"]);
  entry(root, "layers", "one", {
    id: "same",
    order: 10,
    title: "One",
    summary: "First changes.",
    files: ["src/a.ts", "src/a.ts"],
  });
  entry(root, "layers", "two", {
    id: "same",
    order: 10,
    title: "Two",
    summary: "Second changes.",
    files: [],
  });
  entry(root, "stories", "one", {
    id: "same-story",
    order: 1,
    title: "One",
    primary: true,
  });
  entry(root, "stories", "two", {
    id: "same-story",
    order: 1,
    title: "Two",
    primary: true,
  });
  const result = validate(root);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /duplicate layer id: same/);
  assert.match(result.stderr, /duplicate layer order: 10/);
  assert.match(result.stderr, /duplicate file entry src\/a\.ts/);
  assert.match(result.stderr, /empty layers are not allowed/);
  assert.match(result.stderr, /duplicate story id: same-story/);
  assert.match(result.stderr, /duplicate story order: 1/);
  assert.match(result.stderr, /at most one story may declare primary/);
});

test("loads runtime paths with authenticated enterprise gh api", () => {
  const root = fixture();
  entry(root, "layers", "runtime", {
    id: "runtime",
    order: 10,
    title: "Runtime",
    summary: "Runtime changes.",
    files: ["src/live.ts"],
  });
  mkdirSync(join(root, "runtime"));
  writeFileSync(
    join(root, "runtime/source.json"),
    JSON.stringify({
      repository: "https://cto-github.cisco.com/acme/project",
      url: "https://cto-github.cisco.com/acme/project/pull/42",
      pr: 42,
      endpoint: "/api/pr-review/live-review",
    }),
  );
  const bin = join(root, "bin");
  mkdirSync(bin);
  writeFileSync(
    join(bin, "gh"),
    `#!/bin/sh\nprintf '%s\\n' "$@" > "${join(root, "gh-args.txt")}"\nprintf 'src/live.ts\\n'\n`,
  );
  chmodSync(join(bin, "gh"), 0o755);
  const result = validate(root, { PATH: `${bin}:${process.env.PATH}` });
  assert.equal(result.status, 0, result.stderr);
  const args = readFileSync(join(root, "gh-args.txt"), "utf8");
  assert.match(args, /--hostname\ncto-github\.cisco\.com/);
  assert.match(args, /repos\/acme\/project\/pulls\/42\/files/);
});
