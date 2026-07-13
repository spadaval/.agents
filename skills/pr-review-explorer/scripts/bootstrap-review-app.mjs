#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const value = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
};
const repo = resolve(value("--repo") ?? ".");
const pr = value("--pr");
const id = value("--id");
if (!id) {
  throw new Error(
    "Usage: bootstrap-review-app.mjs --repo <repo> --id <artifact-id> [--pr <number>] [--title <title>]",
  );
}

const run = (...args) => {
  try {
    return execFileSync(args[0], args.slice(1), {
      cwd: repo,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const detail =
      error.stderr?.toString().trim() ||
      error.stdout?.toString().trim() ||
      error.message;
    throw new Error("Command failed (" + args.join(" ") + "): " + detail);
  }
};

const meta = JSON.parse(
  run(
    "gh",
    "pr",
    "view",
    ...(pr ? [pr] : []),
    "--json",
    "number,title,url,baseRefName,headRefName,headRefOid,state",
  ),
);
const prUrl = new URL(meta.url);
const repositoryParts = prUrl.pathname.split("/").filter(Boolean).slice(0, 2);
if (repositoryParts.length !== 2)
  throw new Error(
    "Pull request URL does not identify a repository: " + meta.url,
  );
const repositoryUrl = prUrl.origin + "/" + repositoryParts.join("/");
const skill = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const agentsRoot = resolve(skill, "..", "..");
const hub = join(agentsRoot, "bin", "artifact-hub");
const template = join(skill, "assets", "template");
if (!existsSync(hub)) throw new Error("Artifact Hub CLI is missing: " + hub);

const prepared = mkdtempSync(join(tmpdir(), "artifact-hub-pr-runtime-"));
try {
  cpSync(template, prepared, { recursive: true });
  const runtime = join(prepared, "runtime");
  mkdirSync(runtime, { recursive: true });
  writeFileSync(
    join(runtime, "source.json"),
    JSON.stringify(
      {
        repository: repositoryUrl,
        url: meta.url,
        pr: Number(meta.number),
        endpoint: "/api/pr-review/" + encodeURIComponent(id),
      },
      null,
      2,
    ) + "\n",
  );

  const output = execFileSync(
    hub,
    [
      "create",
      id,
      "--title",
      value("--title") ?? "PR #" + meta.number + ": " + meta.title,
      "--description",
      "Runtime-backed pull request review",
      "--from",
      prepared,
      "--entry",
      "index.html",
      "--kind",
      "pr-review",
      "--tag",
      "review",
      "--tag",
      "pr-" + meta.number,
      "--source-json",
      JSON.stringify({
        repository: repositoryUrl,
        project: basename(repositoryUrl),
        pr: Number(meta.number),
        url: meta.url,
        head: meta.headRefOid,
        branch: meta.headRefName,
        baseBranch: meta.baseRefName,
        status: meta.state,
      }),
      "--json",
    ],
    { encoding: "utf8" },
  );
  const result = JSON.parse(output);
  console.log("Review artifact: " + result.path);
  console.log("Author layers: " + join(result.path, "src", "review", "layers"));
  console.log("Viewer URL: " + result.url);
} finally {
  rmSync(prepared, { recursive: true, force: true });
}
