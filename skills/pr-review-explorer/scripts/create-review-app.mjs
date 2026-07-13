#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const workspaceArg = argv[0];
const value = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
};
const consume = argv.includes("--consume");

if (!workspaceArg || workspaceArg.startsWith("--") || !value("--id")) {
  throw new Error(
    "Usage: create-review-app.mjs <extracted-workspace> --id <artifact-id> [--title <title>] [--consume]",
  );
}

const workspace = resolve(workspaceArg);
const evidencePath = join(workspace, "evidence", "pr.json");
if (!existsSync(evidencePath)) {
  throw new Error(`Missing extracted PR evidence: ${evidencePath}`);
}

const skill = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const agentsRoot = resolve(skill, "..", "..");
const hub = join(agentsRoot, "bin", "artifact-hub");
const template = join(skill, "assets", "template");
if (!existsSync(hub)) throw new Error(`Artifact Hub CLI is missing: ${hub}`);

const pack = JSON.parse(readFileSync(evidencePath, "utf8"));
const id = value("--id");
const title = value("--title") ?? `PR #${pack.pr.number}: ${pack.pr.title}`;
const prepared = mkdtempSync(join(tmpdir(), "artifact-hub-pr-review-"));

try {
  cpSync(template, prepared, { recursive: true });
  cpSync(join(workspace, "evidence"), join(prepared, "evidence"), {
    recursive: true,
  });
  cpSync(join(workspace, "markdown"), join(prepared, "markdown"), {
    recursive: true,
  });

  const output = execFileSync(
    hub,
    [
      "create",
      id,
      "--title",
      title,
      "--from",
      prepared,
      "--entry",
      "index.html",
      "--kind",
      "pr-review",
      "--tag",
      "review",
      "--tag",
      `pr-${pack.pr.number}`,
      "--source-json",
      JSON.stringify({
        repository: pack.repository,
        project: basename(pack.repository),
        pr: pack.pr.number,
        url: pack.pr.url,
        head: pack.pr.headRefOid,
        branch: pack.pr.headRefName,
        baseBranch: pack.pr.baseRefName,
        status: pack.pr.state,
      }),
      "--json",
    ],
    { encoding: "utf8" },
  );
  const result = JSON.parse(output);

  if (consume) rmSync(workspace, { recursive: true, force: true });
  console.log(`Review artifact: ${result.path}`);
  console.log(`Author layers: ${join(result.path, "src", "review", "layers")}`);
  console.log(`Viewer URL: ${result.url}`);
} finally {
  rmSync(prepared, { recursive: true, force: true });
}
