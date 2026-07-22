import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { Plugin } from "vite";
import {
  normalizeReviewDecision,
  type GitHubReviewDecision,
} from "./pr-review-decision";

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
  if (marker && marker !== "/dev/null") {
    const decoded = decodeGitQuotedPath(marker);
    return decoded.replace(/^[ab]\//, "");
  }

  const header = markers.find((line) => line.startsWith("diff --git "));
  const fallback = header ? gitDiffHeaderPaths(header).at(-1) : undefined;
  if (fallback && fallback !== "/dev/null")
    return decodeGitQuotedPath(fallback).replace(/^b\//, "");

  if (!marker || marker === "/dev/null") {
    throw new Error("unified diff chunk has no source or destination path");
  }
  throw new Error("unified diff chunk has no source or destination path");
}

function gitDiffHeaderPaths(header: string): string[] {
  const source = header.slice("diff --git ".length);
  const paths: string[] = [];
  let current = "";
  let quoted = false;
  let escaped = false;
  for (const character of source) {
    if (quoted) {
      current += character;
      if (escaped) escaped = false;
      else if (character === "\\") escaped = true;
      else if (character === '"') quoted = false;
      continue;
    }
    if (character === '"') {
      quoted = true;
      current += character;
      continue;
    }
    if (character === " ") {
      if (current) {
        paths.push(current);
        current = "";
      }
      continue;
    }
    current += character;
  }
  if (current) paths.push(current);
  return paths;
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

export function pullRequestState(metadata: Record<string, unknown>): string {
  return metadata.merged_at
    ? "MERGED"
    : String(metadata.state ?? "").toUpperCase();
}

function prSummary(
  metadata: Record<string, any>,
  source: RuntimeSource,
  owner: string,
  repository: string,
  fallbackChangedFiles = 0,
  reviewDecision?: GitHubReviewDecision,
) {
  const mergedAt = metadata.merged_at ? String(metadata.merged_at) : undefined;
  return {
    schemaVersion: 1 as const,
    repository: `${owner}/${repository}`,
    pr: {
      additions: Number(metadata.additions ?? 0),
      author: metadata.user
        ? { login: metadata.user.login, name: metadata.user.name ?? "" }
        : undefined,
      baseRefName: String(metadata.base?.ref ?? ""),
      baseRefOid: String(metadata.base?.sha ?? ""),
      body: String(metadata.body ?? ""),
      changedFiles: Number(metadata.changed_files ?? fallbackChangedFiles),
      comments: Number(metadata.comments ?? 0),
      createdAt: String(metadata.created_at ?? ""),
      deletions: Number(metadata.deletions ?? 0),
      headRefName: String(metadata.head?.ref ?? ""),
      headRefOid: String(metadata.head?.sha ?? ""),
      headRepository: String(
        metadata.head?.repo?.full_name ?? `${owner}/${repository}`,
      ),
      isDraft: Boolean(metadata.draft),
      mergedAt,
      number: Number(metadata.number),
      reviewDecision,
      reviewComments: Number(metadata.review_comments ?? 0),
      baseRepository: String(
        metadata.base?.repo?.full_name ?? `${owner}/${repository}`,
      ),
      state: pullRequestState(metadata),
      title: String(metadata.title ?? ""),
      updatedAt: String(metadata.updated_at ?? ""),
      url: String(metadata.html_url ?? source.url ?? ""),
    },
  };
}

export function reviewDecisionArgs(
  host: string,
  owner: string,
  repository: string,
  pr: number,
): string[] {
  return [
    "pr",
    "view",
    String(pr),
    "--repo",
    `${host}/${owner}/${repository}`,
    "--json",
    "reviewDecision",
    "--jq",
    '.reviewDecision // ""',
  ];
}

async function loadReviewDecision(
  source: RuntimeSource,
  host: string,
  owner: string,
  repository: string,
) {
  return normalizeReviewDecision(
    await run("gh", reviewDecisionArgs(host, owner, repository, source.pr)),
  );
}

async function loadPrSummary(source: RuntimeSource) {
  const { host, owner, repository } = repositoryCoordinates(source);
  const [metadataText, reviewDecision] = await Promise.all([
    run("gh", [
      "api",
      "--hostname",
      host,
      `repos/${owner}/${repository}/pulls/${source.pr}`,
    ]),
    loadReviewDecision(source, host, owner, repository),
  ]);
  return prSummary(
    JSON.parse(metadataText),
    source,
    owner,
    repository,
    0,
    reviewDecision,
  );
}

type PrSummaryValue = Awaited<ReturnType<typeof loadPrSummary>>;

type BatchPrSummarySnapshot = {
  schemaVersion: 1;
  generatedAt: string;
  freshness: "live" | "partial" | "stale";
  summaries: Record<string, PrSummaryValue>;
  errors: Record<string, string>;
};

let batchCache:
  { expiresAt: number; promise: Promise<BatchPrSummarySnapshot> } | undefined;
let lastCompleteBatch: BatchPrSummarySnapshot | undefined;

async function listPrSources(
  artifactRoot: string,
): Promise<Array<{ id: string; source: RuntimeSource }>> {
  const entries = await fs.readdir(artifactRoot, { withFileTypes: true });
  const sources = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory() && ID_PATTERN.test(entry.name))
      .map(async (entry) => {
        try {
          const manifest = JSON.parse(
            await fs.readFile(
              path.join(artifactRoot, entry.name, "manifest.json"),
              "utf8",
            ),
          ) as { kind?: unknown };
          if (manifest.kind !== "pr-review") return undefined;
          return {
            id: entry.name,
            source: await sourceForArtifact(artifactRoot, entry.name),
          };
        } catch {
          return undefined;
        }
      }),
  );
  return sources.filter(
    (value): value is { id: string; source: RuntimeSource } =>
      value !== undefined,
  );
}

async function mapWithConcurrency<T, R>(
  values: T[],
  concurrency: number,
  mapper: (value: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(values.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < values.length) {
      const index = nextIndex++;
      results[index] = await mapper(values[index]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, () =>
      worker(),
    ),
  );
  return results;
}

async function loadBatchPrSummaries(
  artifactRoot: string,
): Promise<BatchPrSummarySnapshot> {
  const sources = await listPrSources(artifactRoot);
  type SettledSummary =
    | { id: string; ok: true; value: PrSummaryValue }
    | { id: string; ok: false; error: string };
  const settled = await mapWithConcurrency<
    { id: string; source: RuntimeSource },
    SettledSummary
  >(sources, 4, async ({ id, source }) => {
    try {
      return { id, ok: true, value: await loadPrSummary(source) };
    } catch (error) {
      return {
        id,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });
  const summaries: Record<string, PrSummaryValue> = {};
  const errors: Record<string, string> = {};
  for (const result of settled) {
    if (result.ok) summaries[result.id] = result.value;
    else errors[result.id] = result.error;
  }
  const complete = Object.keys(errors).length === 0;
  const snapshot: BatchPrSummarySnapshot = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    freshness: complete ? "live" : "partial",
    summaries,
    errors,
  };
  if (complete) {
    lastCompleteBatch = snapshot;
    return snapshot;
  }
  return lastCompleteBatch
    ? { ...lastCompleteBatch, freshness: "stale", errors }
    : snapshot;
}

function batchPrSummaries(
  artifactRoot: string,
): Promise<BatchPrSummarySnapshot> {
  if (batchCache && batchCache.expiresAt > Date.now())
    return batchCache.promise;
  const promise = loadBatchPrSummaries(artifactRoot);
  batchCache = { expiresAt: Date.now() + CACHE_TTL_MS, promise };
  promise.catch(() => {
    if (batchCache?.promise === promise) batchCache = undefined;
  });
  return promise;
}

async function loadPr(source: RuntimeSource) {
  const { host, owner, repository } = repositoryCoordinates(source);
  const apiPath = `repos/${owner}/${repository}/pulls/${source.pr}`;
  const [metadataText, filesText, unifiedDiff, reviewDecision] =
    await Promise.all([
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
      loadReviewDecision(source, host, owner, repository),
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
  const summary = prSummary(
    metadata,
    source,
    owner,
    repository,
    files.length,
    reviewDecision,
  );
  return {
    ...summary,
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
        if (url.pathname === "/api/pr-review-summaries") {
          try {
            const value = await batchPrSummaries(artifactRoot);
            response.statusCode = 200;
            response.setHeader(
              "Content-Type",
              "application/json; charset=utf-8",
            );
            response.setHeader("Cache-Control", "no-store");
            response.end(JSON.stringify(value));
          } catch (error) {
            response.statusCode = 502;
            response.setHeader(
              "Content-Type",
              "application/json; charset=utf-8",
            );
            response.end(
              JSON.stringify({
                error: error instanceof Error ? error.message : String(error),
              }),
            );
          }
          return;
        }
        const match = url.pathname.match(
          /^\/api\/pr-review\/([^/]+)(\/summary)?$/,
        );
        if (!match) return next();
        try {
          const id = decodeURIComponent(match[1]);
          const summaryOnly = Boolean(match[2]);
          const source = await sourceForArtifact(artifactRoot, id);
          const cacheKey = `${summaryOnly ? "summary" : "review"}:${id}:${JSON.stringify(source)}`;
          let cached = cache.get(cacheKey);
          if (cached && cached.expiresAt <= Date.now()) {
            cache.delete(cacheKey);
            cached = undefined;
          }
          if (!cached) {
            const promise = summaryOnly
              ? loadPrSummary(source)
              : loadPr(source);
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
