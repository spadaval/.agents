#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const argv = process.argv.slice(2);
const id = argv[0];
const value = (name) => {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
};

if (!id || id.startsWith("--")) {
  throw new Error(
    "Usage: create-plan-app.mjs <artifact-id> --title <title> [--repository <path>]",
  );
}

const skill = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const agentsRoot = resolve(skill, "..", "..");
const hub = join(agentsRoot, "bin", "artifact-hub");
const template = join(skill, "assets", "template");
if (!existsSync(hub)) throw new Error(`Artifact Hub CLI is missing: ${hub}`);
if (!existsSync(join(template, "index.html"))) {
  throw new Error(`Plan artifact template is incomplete: ${template}`);
}

const title = value("--title") ?? `Implementation plan: ${id}`;
const repository = resolve(value("--repository") ?? process.cwd());
const output = execFileSync(
  hub,
  [
    "create",
    id,
    "--title",
    title,
    "--from",
    template,
    "--entry",
    "index.html",
    "--kind",
    "html-plan",
    "--tag",
    "plan",
    "--source-json",
    JSON.stringify({ repository, project: repository.split("/").filter(Boolean).at(-1) }),
    "--json",
  ],
  { encoding: "utf8" },
);
const result = JSON.parse(output);

console.log(`Plan artifact: ${result.path}`);
console.log(`Author plan app: ${join(result.path, "src", "App.svelte")}`);
console.log(`Viewer URL: ${result.url}`);
