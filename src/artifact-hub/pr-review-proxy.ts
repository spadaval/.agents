import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Plugin } from "vite";

const execFileAsync = promisify(execFile);
const ID_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,78}[a-z0-9])?$/;
const CACHE_TTL_MS = 15_000;
const CACHE_MAX_ENTRIES = 8;

type RuntimeSource = {
  repository?: string;
  url?: string;
  pr: number;
};

type GitHubFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  patch?: string;
};

type CacheEntry = { expiresAt: number; promise: Promise<unknown> };

const cache = new Map<string, CacheEntry>();

function commandFailure(command: string, error: unknown): Error {
  const detail =
    typeof error === "object" && error !== null
      ? String(
          (error as { stderr?: string }).stderr ||
            (error as { stdout?: string }).stdout ||
            (error as { message?: string }).message ||
            error,
        ).trim()
      : String(error);
  return new Error(`${command}: ${detail}`);
}

async function run(command: string, args: string[]): Promise<string> {
  try {
    const { stdout } = await execFileAsync(command, args, {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    });
    return stdout;
  } catch (error) {
    throw commandFailure([command, ...args].join(" "), error);
  }
}

export function splitUnifiedDiff(diff: string): string[] {
  const starts = [...diff.matchAll(/^diff --git /gm)].map(
    (match) => match.index!,
  );
  return starts.map((start, index) =>
    diff.slice(start, starts[index + 1] ?? diff.length).trimEnd(),
  );
}

function decodeGitQuotedPath(value: string): string {
  if (!value.startsWith('"') || !value.endsWith('"')) return value;
  const bytes: number[] = [];
  const source = value.slice(1, -1);
  const escapes: Record<string, number> = {
    a: 7,
    b: 8,
    t: 9,
    n: 10,
    v: 11,
    f: 12,
    r: 13,
    '"': 34,
    "\\": 92,
  };
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character !== "\\") {
      bytes.push(...Buffer.from(character));
      continue;
    }
    const next = source[++index];
    if (next === undefined)
      throw new Error(`invalid quoted Git path: ${value}`);
    if (/[0-7]/.test(next)) {
      let octal = next;
      while (octal.length < 3 && /[0-7]/.test(source[index + 1] ?? "")) {
        octal += source[++index];
      }
      bytes.push(Number.parseInt(octal, 8));
      continue;
    }
    bytes.push(escapes[next] ?? next.charCodeAt(0));
  }
  return Buffer.from(bytes).toString("utf8");
}

export function unifiedDiffPath(chunk: string): string {
  const markers = chunk.split("\n");
  const added = markers.find((line) => line.startsWith("+++ "))?.slice(4);
  const removed = markers.find((line) => line.startsWith("--- "))?.slice(4);
  const marker = added && added !== "/dev/null" ? added : removed;
  if (!marker || marker === "/dev/null") {
    throw new Error("unified diff chunk has no source or destination path");
  }
  const decoded = decodeGitQuotedPath(marker);
  return decoded.replace(/^[ab]\//, "");
}

export function associateDiffs(
  files: GitHubFile[],
  chunks: string[],
): Map<string, string> {
  const byPath = new Map<string, string>();
  for (const chunk of chunks) {
    const filePath = unifiedDiffPath(chunk);
    if (byPath.has(filePath)) {
      throw new Error(`duplicate unified diff chunk for ${filePath}`);
    }
    byPath.set(filePath, chunk);
  }
  const expected = new Set(files.map((file) => file.filename));
  const missing = files
    .map((file) => file.filename)
    .filter((filePath) => !byPath.has(filePath));
  const unexpected = [...byPath.keys()].filter(
    (filePath) => !expected.has(filePath),
  );
  if (missing.length || unexpected.length) {
    throw new Error(
      `unified diff/file metadata mismatch; missing: ${missing.join(", ") || "none"}; unexpected: ${unexpected.join(", ") || "none"}`,
    );
  }
  return byPath;
}

function normalizeStatus(status: string): string {
  return (
    {
      added: "A",
      removed: "D",
      modified: "M",
      renamed: "R",
      copied: "C",
      changed: "M",
    }[status] ?? status.toUpperCase()
  );
}

function repositoryCoordinates(source: RuntimeSource) {
  const raw = source.url ?? source.repository;
  if (!raw) throw new Error("runtime source is missing repository URL");
  const url = new URL(raw);
  const parts = url.pathname.split("/").filter(Boolean);
  const owner = parts[0];
  const repository = parts[1]?.replace(/\.git$/, "");
  if (!owner || !repository)
    throw new Error("runtime source does not identify an owner and repository");
  return { host: url.hostname, owner, repository };
}

async function loadPr(source: RuntimeSource) {
  const { host, owner, repository } = repositoryCoordinates(source);
  const apiPath = `repos/${owner}/${repository}/pulls/${source.pr}`;
  const [metadataText, filesText, unifiedDiff] = await Promise.all([
    run("gh", ["api", "--hostname", host, apiPath]),
    run("gh", [
      "api",
      "--hostname",
      host,
      "--paginate",
      "--slurp",
      `${apiPath}/files?per_page=100`,
    ]),
    run("gh", [
      "pr",
      "diff",
      String(source.pr),
      "--repo",
      `${host}/${owner}/${repository}`,
    ]),
  ]);
  const metadata = JSON.parse(metadataText);
  const pages = JSON.parse(filesText) as GitHubFile[][];
  const apiFiles = pages.flat();
  const chunks = splitUnifiedDiff(unifiedDiff);
  const diffs = associateDiffs(apiFiles, chunks);
  const files = apiFiles.map((file) => ({
    path: file.filename,
    status: normalizeStatus(file.status),
    additions: String(file.additions),
    deletions: String(file.deletions),
    diff: diffs.get(file.filename)!,
  }));
  return {
    schemaVersion: 1,
    repository: `${owner}/${repository}`,
    pr: {
      additions: Number(metadata.additions ?? 0),
      author: metadata.user
        ? { login: metadata.user.login, name: metadata.user.name ?? "" }
        : undefined,
      baseRefName: String(metadata.base?.ref ?? ""),
      baseRefOid: String(metadata.base?.sha ?? ""),
      body: String(metadata.body ?? ""),
      changedFiles: Number(metadata.changed_files ?? files.length),
      deletions: Number(metadata.deletions ?? 0),
      headRefName: String(metadata.head?.ref ?? ""),
      headRefOid: String(metadata.head?.sha ?? ""),
      isDraft: Boolean(metadata.draft),
      number: Number(metadata.number),
      state: String(metadata.state ?? "").toUpperCase(),
      title: String(metadata.title ?? ""),
      url: String(metadata.html_url ?? source.url ?? ""),
    },
    files,
  };
}

async function sourceForArtifact(artifactRoot: string, id: string) {
  if (!ID_PATTERN.test(id)) throw new Error("invalid artifact id");
  const artifactPath = path.resolve(artifactRoot, id);
  if (path.dirname(artifactPath) !== path.resolve(artifactRoot))
    throw new Error("artifact path escapes the artifact root");
  const sourcePath = path.join(artifactPath, "runtime", "source.json");
  return JSON.parse(await fs.readFile(sourcePath, "utf8")) as RuntimeSource;
}

export function prReviewProxy(artifactRoot: string): Plugin {
  return {
    name: "artifact-hub-pr-review-proxy",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        const url = new URL(request.url ?? "/", "http://artifact-hub.local");
        const match = url.pathname.match(/^\/api\/pr-review\/([^/]+)$/);
        if (!match) return next();
        try {
          const id = decodeURIComponent(match[1]);
          const source = await sourceForArtifact(artifactRoot, id);
          const cacheKey = `${id}:${JSON.stringify(source)}`;
          let cached = cache.get(cacheKey);
          if (cached && cached.expiresAt <= Date.now()) {
            cache.delete(cacheKey);
            cached = undefined;
          }
          if (!cached) {
            const promise = loadPr(source);
            cached = { expiresAt: Date.now() + CACHE_TTL_MS, promise };
            cache.set(cacheKey, cached);
            promise.catch(() => {
              if (cache.get(cacheKey)?.promise === promise)
                cache.delete(cacheKey);
            });
            while (cache.size > CACHE_MAX_ENTRIES) {
              const oldest = cache.keys().next().value as string | undefined;
              if (oldest === undefined) break;
              cache.delete(oldest);
            }
          }
          const value = await cached.promise;
          response.statusCode = 200;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.setHeader("Cache-Control", "no-store");
          response.end(JSON.stringify(value));
        } catch (error) {
          response.statusCode = 502;
          response.setHeader("Content-Type", "application/json; charset=utf-8");
          response.end(
            JSON.stringify({
              error: error instanceof Error ? error.message : String(error),
            }),
          );
        }
      });
    },
  };
}
