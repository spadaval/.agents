#!/usr/bin/env node
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const supplied = process.argv[2];
if (!supplied) {
  throw new Error("Usage: create-plan-app.mjs <new-workspace>");
}

const workspace = resolve(supplied);
const app = join(workspace, "app");
if (existsSync(app) || existsSync(join(workspace, "manifest.json"))) {
  throw new Error(`Plan workspace already exists: ${workspace}`);
}

for (const command of ["node", "npm"]) {
  const pathEntries = (process.env.PATH ?? "").split(":");
  const available = pathEntries.some((entry) =>
    existsSync(join(entry, command)),
  );
  if (!available) throw new Error(`Missing required command on PATH: ${command}`);
}

const skill = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const template = join(skill, "assets", "template");
if (!existsSync(join(template, "package.json"))) {
  throw new Error(`Plan app template is incomplete: ${template}`);
}

mkdirSync(workspace, { recursive: true, mode: 0o700 });
cpSync(template, app, { recursive: true });
const manifest = {
  schemaVersion: 1,
  kind: "generate-html-plan",
  createdAt: new Date().toISOString(),
  app: "app",
  authoredPlan: "app/src/plan/plan.ts",
};
writeFileSync(
  join(workspace, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  { mode: 0o600 },
);

const packageName = `html-plan-${workspace.split("/").filter(Boolean).at(-1)}`
  .toLowerCase()
  .replace(/[^a-z0-9-]+/g, "-");
const packagePath = join(app, "package.json");
const pkg = JSON.parse(readFileSync(packagePath, "utf8"));
pkg.name = packageName;
writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);

console.log(`Plan workspace: ${workspace}`);
console.log(`Author plan: ${join(app, "src", "plan", "plan.ts")}`);
