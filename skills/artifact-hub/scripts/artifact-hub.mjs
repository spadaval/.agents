#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import { constants as fsConstants } from "node:fs";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const SCRIPT_DIR = path.dirname(SCRIPT_PATH);
export const HUB_ROOT = path.resolve(SCRIPT_DIR, "../../..");
export const ARTIFACT_ROOT = path.resolve(
  process.env.ARTIFACT_HUB_ROOT ?? path.join(HUB_ROOT, "artifacts"),
);
const GENERIC_TEMPLATE = path.join(
  HUB_ROOT,
  "skills/artifact-hub/assets/generic-artifact",
);
const UNIT_TEMPLATE = path.join(
  HUB_ROOT,
  "skills/artifact-hub/assets/artifact-hub.service.in",
);
const UNIT_NAME = "artifact-hub.service";
const UNIT_PATH = path.join(os.homedir(), ".config/systemd/user", UNIT_NAME);
const DEFAULT_PORT = 5173;
const ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,78}[a-z0-9])?$/;
const PRIVATE_RUNTIME_NAMES = new Set([
  "node_modules",
  "package.json",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
  "bun.lock",
  "bun.lockb",
  "vite.config.js",
  "vite.config.mjs",
  "vite.config.ts",
]);

const HELP = `Artifact Hub — one local runtime for complete Svelte artifact apps

Usage:
  artifact-hub service install [--port <number>] [--now]
  artifact-hub service uninstall [--now]
  artifact-hub start | stop | restart | status
  artifact-hub logs [--follow]
  artifact-hub doctor
  artifact-hub open [<id>] [--print]
  artifact-hub list [--json]
  artifact-hub path <id>
  artifact-hub create <id> --title <title> [options]
  artifact-hub remove <id> --force

Create options:
  --from <directory>       Copy a complete producer-owned template
  --entry <path>           Artifact-relative HTML entry (default: index.html)
  --description <text>     Catalog description
  --kind <kind>            Optional catalog grouping
  --tag <tag>              Repeatable catalog tag
  --source-json <object>   Source context as one JSON object
  --created-at <date>      Preserve a source creation time (default: now)
  --json                   Print machine-readable creation output

The default template is a deliberately small Svelte starter. Lifecycle commands
delegate to systemd --user; Artifact Hub never stores or signals process IDs.`;

export function validateArtifactId(id) {
  if (!ID_PATTERN.test(id) || id === "." || id === "..") {
    throw new Error(
      "artifact id must be 1-80 lowercase letters, numbers, dots, underscores, or hyphens and start and end with a letter or number",
    );
  }
  return id;
}

export function resolveArtifactPath(id, root = ARTIFACT_ROOT) {
  validateArtifactId(id);
  const resolvedRoot = path.resolve(root);
  const destination = path.resolve(resolvedRoot, id);
  if (path.dirname(destination) !== resolvedRoot)
    throw new Error("artifact path escapes the canonical root");
  return destination;
}

export function validateEntryPath(entry) {
  if (
    !entry ||
    path.isAbsolute(entry) ||
    entry.includes("\\") ||
    entry.includes("\0")
  ) {
    throw new Error("entry must be a non-empty artifact-relative path");
  }
  const parts = entry.split("/");
  if (parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error("entry must stay within the artifact directory");
  }
  if (!entry.endsWith(".html")) throw new Error("entry must name an HTML file");
  return entry;
}

export function buildManifest({
  id,
  title,
  entry = "index.html",
  description,
  kind,
  tags,
  source,
  createdAt,
}) {
  validateArtifactId(id);
  validateEntryPath(entry);
  if (typeof title !== "string" || title.trim() === "")
    throw new Error("--title is required");
  const timestamp = createdAt ?? new Date().toISOString();
  if (Number.isNaN(Date.parse(timestamp)))
    throw new Error("--created-at must be a valid date-time");
  if (
    source !== undefined &&
    (typeof source !== "object" || source === null || Array.isArray(source))
  ) {
    throw new Error("--source-json must decode to an object");
  }
  return {
    manifestVersion: 1,
    id,
    title: title.trim(),
    createdAt: timestamp,
    entry,
    ...(description ? { description } : {}),
    ...(kind ? { kind } : {}),
    ...(tags?.length ? { tags: [...new Set(tags)] } : {}),
    ...(source ? { source } : {}),
  };
}

function parseFlags(args, repeatable = new Set()) {
  const positional = [];
  const flags = new Map();
  for (let index = 0; index < args.length; index += 1) {
    const item = args[index];
    if (!item.startsWith("--")) {
      positional.push(item);
      continue;
    }
    const name = item.slice(2);
    if (["force", "follow", "json", "now", "print"].includes(name)) {
      flags.set(name, true);
      continue;
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith("--"))
      throw new Error(`--${name} requires a value`);
    index += 1;
    if (repeatable.has(name)) {
      flags.set(name, [...(flags.get(name) ?? []), value]);
    } else if (flags.has(name)) {
      throw new Error(`--${name} may be provided only once`);
    } else {
      flags.set(name, value);
    }
  }
  return { positional, flags };
}

function assertOnlyFlags(flags, allowed) {
  for (const name of flags.keys()) {
    if (!allowed.has(name)) throw new Error(`unknown option --${name}`);
  }
}

async function ensureArtifactRoot(root = ARTIFACT_ROOT) {
  await fs.mkdir(root, { recursive: true, mode: 0o700 });
  await fs.chmod(root, 0o700);
  const stat = await fs.lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink())
    throw new Error(`${root} must be a real directory`);
}

async function walkTemplate(directory, relative = "") {
  const entries = await fs.readdir(path.join(directory, relative), {
    withFileTypes: true,
  });
  for (const entry of entries) {
    const childRelative = path.join(relative, entry.name);
    const childPath = path.join(directory, childRelative);
    const stat = await fs.lstat(childPath);
    if (stat.isSymbolicLink())
      throw new Error(
        `template contains unsupported symlink: ${childRelative}`,
      );
    if (PRIVATE_RUNTIME_NAMES.has(entry.name)) {
      throw new Error(
        `template contains private runtime file: ${childRelative}`,
      );
    }
    if (
      /\.(?:pid|pid\.json)$/i.test(entry.name) ||
      /^\.?(?:vite|viewer).*(?:state|log)\.json$/i.test(entry.name)
    ) {
      throw new Error(
        `template contains private viewer state: ${childRelative}`,
      );
    }
    if (stat.isDirectory()) await walkTemplate(directory, childRelative);
  }
}

async function chmodOwnerOnly(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  await fs.chmod(directory, 0o700);
  for (const entry of entries) {
    const itemPath = path.join(directory, entry.name);
    if (entry.isDirectory()) await chmodOwnerOnly(itemPath);
    else await fs.chmod(itemPath, 0o600);
  }
}

export async function createArtifact(options, root = ARTIFACT_ROOT) {
  const destination = resolveArtifactPath(options.id, root);
  const template = path.resolve(options.template ?? GENERIC_TEMPLATE);
  const manifest = buildManifest(options);
  const temp = path.join(
    path.resolve(root),
    `.${options.id}.tmp-${process.pid}-${Date.now().toString(36)}`,
  );

  await ensureArtifactRoot(root);
  await fs.access(template, fsConstants.R_OK);
  if (!(await fs.stat(template)).isDirectory())
    throw new Error(`template is not a directory: ${template}`);
  await walkTemplate(template);

  try {
    await fs.lstat(destination);
    throw new Error(`artifact already exists: ${destination}`);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  try {
    await fs.mkdir(temp, { mode: 0o700 });
    await fs.cp(template, temp, {
      recursive: true,
      force: false,
      errorOnExist: true,
    });
    const entryPath = path.resolve(temp, manifest.entry);
    if (!entryPath.startsWith(`${temp}${path.sep}`))
      throw new Error("entry escapes the artifact directory");
    const entryStat = await fs.stat(entryPath);
    if (!entryStat.isFile())
      throw new Error(`entry is not a file: ${manifest.entry}`);
    await chmodOwnerOnly(temp);
    await fs.writeFile(
      path.join(temp, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      {
        mode: 0o600,
        flag: "wx",
      },
    );
    await fs.rename(temp, destination);
  } catch (error) {
    await fs.rm(temp, { recursive: true, force: true });
    throw error;
  }

  return {
    path: destination,
    url: artifactUrl(options.id, manifest.entry),
    manifest,
  };
}

function commandResult(command, args, options = {}) {
  return spawnSync(command, args, { encoding: "utf8", ...options });
}

function systemctl(args, options = {}) {
  return commandResult("systemctl", ["--user", ...args], options);
}

function printCommandFailure(result, command) {
  const detail = (
    result.stderr ||
    result.stdout ||
    `${command} exited ${result.status}`
  ).trim();
  if (detail) console.error(detail);
}

function configuredPort() {
  const fromEnvironment = Number.parseInt(
    process.env.ARTIFACT_HUB_PORT ?? "",
    10,
  );
  if (
    Number.isInteger(fromEnvironment) &&
    fromEnvironment > 0 &&
    fromEnvironment < 65536
  )
    return fromEnvironment;
  try {
    const unit = readFileSync(UNIT_PATH, "utf8");
    const configured = Number.parseInt(
      unit.match(/(?:^|\s)--port\s+(\d+)(?:\s|$)/m)?.[1] ?? "",
      10,
    );
    if (Number.isInteger(configured) && configured > 0 && configured < 65536)
      return configured;
  } catch {
    // The default applies before service installation.
  }
  return DEFAULT_PORT;
}

export function artifactUrl(
  id,
  _entry = "index.html",
  port = configuredPort(),
) {
  const baseUrl = (
    process.env.ARTIFACT_HUB_BASE_URL ?? `http://${os.hostname()}:${port}`
  ).replace(/\/+$/, "");
  let parsedBase;
  try {
    parsedBase = new URL(baseUrl);
  } catch {
    throw new Error("ARTIFACT_HUB_BASE_URL must be a valid absolute URL");
  }
  if (!new Set(["http:", "https:"]).has(parsedBase.protocol)) {
    throw new Error("ARTIFACT_HUB_BASE_URL must use http or https");
  }
  const suffix = id ? `/artifacts/${encodeURIComponent(id)}/` : "/";
  return `${baseUrl}${suffix}`;
}

function systemdValue(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

async function installService(flags) {
  const port = Number.parseInt(flags.get("port") ?? String(DEFAULT_PORT), 10);
  if (!Number.isInteger(port) || port < 1 || port > 65535)
    throw new Error("--port must be between 1 and 65535");
  const vitePath = path.join(HUB_ROOT, "node_modules/vite/bin/vite.js");
  await fs.access(vitePath, fsConstants.R_OK);
  let template = await fs.readFile(UNIT_TEMPLATE, "utf8");
  const replacements = {
    "{{NODE}}": process.execPath,
    "{{VITE}}": vitePath,
    "{{ROOT}}": HUB_ROOT,
    "{{CONFIG}}": path.join(HUB_ROOT, "vite.config.ts"),
    "{{HOME}}": os.homedir(),
    "{{PORT}}": String(port),
  };
  for (const [token, value] of Object.entries(replacements)) {
    template = template.replaceAll(token, systemdValue(value));
  }
  await fs.mkdir(path.dirname(UNIT_PATH), { recursive: true, mode: 0o700 });
  const temp = `${UNIT_PATH}.tmp-${process.pid}`;
  await fs.writeFile(temp, template, { mode: 0o600 });
  await fs.rename(temp, UNIT_PATH);
  const reload = systemctl(["daemon-reload"]);
  if (reload.status !== 0) {
    printCommandFailure(reload, "systemctl --user daemon-reload");
    return 1;
  }
  const enable = systemctl(["enable", UNIT_NAME]);
  if (enable.status !== 0) {
    printCommandFailure(enable, `systemctl --user enable ${UNIT_NAME}`);
    return 1;
  }
  if (flags.get("now")) {
    const start = systemctl(["start", UNIT_NAME]);
    if (start.status !== 0) {
      printCommandFailure(start, `systemctl --user start ${UNIT_NAME}`);
      return 1;
    }
  }
  console.log(`Installed ${UNIT_PATH}`);
  console.log(`Catalog: ${artifactUrl(undefined, undefined, port)}`);
  return 0;
}

async function uninstallService(flags) {
  if (flags.get("now"))
    systemctl(["disable", "--now", UNIT_NAME], { stdio: "inherit" });
  else systemctl(["disable", UNIT_NAME], { stdio: "inherit" });
  await fs.rm(UNIT_PATH, { force: true });
  const reload = systemctl(["daemon-reload"], { stdio: "inherit" });
  return reload.status ?? 1;
}

async function listArtifacts(asJson = false, silent = false) {
  await ensureArtifactRoot();
  const directories = (await fs.readdir(ARTIFACT_ROOT, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name));
  const results = [];
  for (const directory of directories) {
    const manifestPath = path.join(
      ARTIFACT_ROOT,
      directory.name,
      "manifest.json",
    );
    try {
      const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
      validateManifestForDirectory(manifest, directory.name);
      results.push({
        id: directory.name,
        valid: true,
        title: manifest.title,
        kind: manifest.kind,
        createdAt: manifest.createdAt,
        path: path.dirname(manifestPath),
        url: artifactUrl(directory.name, manifest.entry ?? "index.html"),
      });
    } catch (error) {
      results.push({
        id: directory.name,
        valid: false,
        error: error instanceof Error ? error.message : String(error),
        path: path.dirname(manifestPath),
      });
    }
  }
  if (silent) return results;
  if (asJson) console.log(JSON.stringify(results, null, 2));
  else if (results.length === 0) console.log("No artifacts.");
  else {
    for (const result of results) {
      console.log(
        result.valid
          ? `${result.id}\t${result.kind ?? "artifact"}\t${result.title ?? "(untitled)"}`
          : `${result.id}\tINVALID\t${result.error}`,
      );
    }
  }
  return results;
}

function validateManifestForDirectory(manifest, directoryName) {
  if (
    typeof manifest !== "object" ||
    manifest === null ||
    Array.isArray(manifest)
  )
    throw new Error("manifest must be an object");
  if (manifest.manifestVersion !== 1)
    throw new Error("manifestVersion must be 1");
  for (const field of ["id", "title", "createdAt", "entry"]) {
    if (typeof manifest[field] !== "string" || manifest[field].trim() === "")
      throw new Error(`${field} must be a non-empty string`);
  }
  validateArtifactId(manifest.id);
  if (manifest.id !== directoryName)
    throw new Error(`manifest id must match directory ${directoryName}`);
  validateEntryPath(manifest.entry);
  if (Number.isNaN(Date.parse(manifest.createdAt)))
    throw new Error("createdAt must be a valid date-time");
  if (
    manifest.tags !== undefined &&
    (!Array.isArray(manifest.tags) ||
      manifest.tags.some((tag) => typeof tag !== "string"))
  ) {
    throw new Error("tags must be an array of strings");
  }
  if (
    manifest.source !== undefined &&
    (typeof manifest.source !== "object" ||
      manifest.source === null ||
      Array.isArray(manifest.source))
  ) {
    throw new Error("source must be an object");
  }
  return manifest;
}

async function servicePortIsOpen(port) {
  return await new Promise((resolve) => {
    const socket = net.createConnection({ host: "127.0.0.1", port });
    const finish = (open) => {
      socket.destroy();
      resolve(open);
    };
    socket.setTimeout(700);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

async function doctor() {
  const checks = [];
  const add = (status, label, detail) => checks.push({ status, label, detail });
  add("PASS", "Node", `${process.version} at ${process.execPath}`);
  try {
    await fs.access(path.join(HUB_ROOT, "node_modules/vite/bin/vite.js"));
    add("PASS", "Dependencies", `${HUB_ROOT}/node_modules`);
  } catch {
    add("FAIL", "Dependencies", `run npm install in ${HUB_ROOT}`);
  }
  try {
    await ensureArtifactRoot();
    const mode = (await fs.stat(ARTIFACT_ROOT)).mode & 0o777;
    add(
      mode === 0o700 ? "PASS" : "FAIL",
      "Artifact root",
      `${ARTIFACT_ROOT} mode ${mode.toString(8)}`,
    );
  } catch (error) {
    add(
      "FAIL",
      "Artifact root",
      error instanceof Error ? error.message : String(error),
    );
  }
  try {
    await fs.access(UNIT_PATH);
    add("PASS", "User unit", UNIT_PATH);
  } catch {
    add("WARN", "User unit", `not installed; run artifact-hub service install`);
  }
  const userManager = systemctl(["is-system-running"]);
  const managerState = (userManager.stdout || userManager.stderr).trim();
  add(
    userManager.status === 0
      ? "PASS"
      : managerState === "degraded"
        ? "WARN"
        : "FAIL",
    "User manager",
    managerState || `exit ${userManager.status}`,
  );
  const active = systemctl(["is-active", UNIT_NAME]);
  const activeState = (active.stdout || active.stderr).trim();
  add(
    active.status === 0 ? "PASS" : "WARN",
    "Service",
    activeState || "not installed",
  );
  const port = configuredPort();
  const open = await servicePortIsOpen(port);
  if (open && active.status === 0)
    add(
      "PASS",
      "Service port",
      `0.0.0.0:${port} is accepting connections (verified via 127.0.0.1)`,
    );
  else if (open)
    add(
      "FAIL",
      "Service port",
      `127.0.0.1:${port} is occupied outside ${UNIT_NAME}`,
    );
  else if (active.status === 0)
    add("FAIL", "Service port", `service is active but port ${port} is closed`);
  else add("WARN", "Service port", `port ${port} is closed`);
  const linger = commandResult("loginctl", [
    "show-user",
    process.env.USER ?? os.userInfo().username,
    "--property=Linger",
    "--value",
  ]);
  const lingerValue = linger.stdout.trim();
  add(
    linger.status === 0 && lingerValue === "yes" ? "PASS" : "WARN",
    "Linger",
    linger.status === 0 ? lingerValue : (linger.stderr || "unavailable").trim(),
  );
  const artifacts = await listArtifacts(false, true);
  const invalid = artifacts.filter((artifact) => !artifact.valid).length;
  add(
    invalid === 0 ? "PASS" : "FAIL",
    "Manifests",
    `${artifacts.length - invalid} valid, ${invalid} invalid`,
  );

  for (const check of checks)
    console.log(
      `${check.status.padEnd(4)}  ${check.label.padEnd(15)} ${check.detail}`,
    );
  const failures = checks.filter((check) => check.status === "FAIL").length;
  const warnings = checks.filter((check) => check.status === "WARN").length;
  console.log(`\n${failures} failure(s), ${warnings} warning(s)`);
  return failures === 0 ? 0 : 1;
}

async function openUrl(url, printOnly) {
  console.log(url);
  if (printOnly || (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY))
    return 0;
  const child = spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
  child.unref();
  return 0;
}

export async function runCli(args) {
  try {
    const [command, ...rest] = args;
    if (
      !command ||
      command === "help" ||
      command === "--help" ||
      command === "-h"
    ) {
      console.log(HELP);
      return 0;
    }

    if (command === "service") {
      const [action, ...serviceArgs] = rest;
      const { positional, flags } = parseFlags(serviceArgs);
      if (positional.length)
        throw new Error(`unexpected argument: ${positional[0]}`);
      if (action === "install") {
        assertOnlyFlags(flags, new Set(["port", "now"]));
        return await installService(flags);
      }
      if (action === "uninstall") {
        assertOnlyFlags(flags, new Set(["now"]));
        return await uninstallService(flags);
      }
      throw new Error("service requires install or uninstall");
    }

    if (["start", "stop", "restart", "status"].includes(command)) {
      if (rest.length) throw new Error(`${command} takes no arguments`);
      const action =
        command === "status"
          ? ["status", "--no-pager", UNIT_NAME]
          : [command, UNIT_NAME];
      const result = systemctl(action, { stdio: "inherit" });
      return result.status ?? 1;
    }

    if (command === "logs") {
      const { positional, flags } = parseFlags(rest);
      assertOnlyFlags(flags, new Set(["follow"]));
      if (positional.length)
        throw new Error("logs takes no positional arguments");
      const args = [
        `--user-unit=${UNIT_NAME}`,
        "--no-pager",
        ...(flags.get("follow") ? ["--follow"] : ["--lines=100"]),
      ];
      const result = commandResult("journalctl", args, { stdio: "inherit" });
      return result.status ?? 1;
    }

    if (command === "doctor") {
      if (rest.length) throw new Error("doctor takes no arguments");
      return await doctor();
    }

    if (command === "list") {
      const { positional, flags } = parseFlags(rest);
      assertOnlyFlags(flags, new Set(["json"]));
      if (positional.length)
        throw new Error("list takes no positional arguments");
      await listArtifacts(Boolean(flags.get("json")));
      return 0;
    }

    if (command === "path") {
      if (rest.length !== 1)
        throw new Error("path requires exactly one artifact id");
      const destination = resolveArtifactPath(rest[0]);
      await fs.access(destination);
      console.log(destination);
      return 0;
    }

    if (command === "open") {
      const { positional, flags } = parseFlags(rest);
      assertOnlyFlags(flags, new Set(["print"]));
      if (positional.length > 1)
        throw new Error("open accepts at most one artifact id");
      if (!positional[0])
        return await openUrl(artifactUrl(), Boolean(flags.get("print")));
      const destination = resolveArtifactPath(positional[0]);
      const manifest = JSON.parse(
        await fs.readFile(path.join(destination, "manifest.json"), "utf8"),
      );
      validateManifestForDirectory(manifest, positional[0]);
      return await openUrl(
        artifactUrl(positional[0], validateEntryPath(manifest.entry)),
        Boolean(flags.get("print")),
      );
    }

    if (command === "create") {
      const { positional, flags } = parseFlags(rest, new Set(["tag"]));
      assertOnlyFlags(
        flags,
        new Set([
          "created-at",
          "description",
          "entry",
          "from",
          "json",
          "kind",
          "source-json",
          "tag",
          "title",
        ]),
      );
      if (positional.length !== 1)
        throw new Error("create requires exactly one artifact id");
      let source;
      if (flags.has("source-json")) {
        try {
          source = JSON.parse(flags.get("source-json"));
        } catch (error) {
          throw new Error(
            `--source-json is invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
      const result = await createArtifact({
        id: positional[0],
        title: flags.get("title"),
        template: flags.get("from"),
        entry: flags.get("entry") ?? "index.html",
        description: flags.get("description"),
        kind: flags.get("kind"),
        tags: flags.get("tag") ?? [],
        source,
        createdAt: flags.get("created-at"),
      });
      if (flags.get("json")) console.log(JSON.stringify(result, null, 2));
      else {
        console.log(`Created ${result.path}`);
        console.log(result.url);
      }
      return 0;
    }

    if (command === "remove") {
      const { positional, flags } = parseFlags(rest);
      assertOnlyFlags(flags, new Set(["force"]));
      if (positional.length !== 1 || !flags.get("force"))
        throw new Error("remove requires exactly one artifact id and --force");
      const destination = resolveArtifactPath(positional[0]);
      const stat = await fs.lstat(destination);
      if (!stat.isDirectory() || stat.isSymbolicLink())
        throw new Error("refusing to remove a non-directory or symlink");
      await fs.rm(destination, { recursive: true });
      console.log(`Removed ${destination}`);
      return 0;
    }

    throw new Error(`unknown command: ${command}`);
  } catch (error) {
    console.error(
      `artifact-hub: ${error instanceof Error ? error.message : String(error)}`,
    );
    return 1;
  }
}

if (
  process.argv[1] &&
  pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url
) {
  process.exitCode = await runCli(process.argv.slice(2));
}
