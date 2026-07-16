import type { ReviewFile } from "./types";

export type ReviewPack = {
  repository?: string;
  pr: {
    number: number;
    title: string;
    url: string;
    baseRefName: string;
    headRefName: string;
    baseRefOid?: string;
    headRefOid?: string;
    additions: number;
    deletions: number;
    changedFiles: number;
    body?: string;
    author?: { login: string; name?: string };
    comments?: number;
    reviewComments?: number;
    createdAt?: string;
    updatedAt?: string;
    state?: string;
    isDraft?: boolean;
  };
  files: ReviewFile[];
};

export type RuntimeSource = {
  repository: string;
  pr: number;
  url?: string;
  endpoint?: string;
};

export class ReviewLoadError extends Error {
  readonly status?: number;
  readonly detail?: string;
  readonly prNumber?: number;
  readonly prUrl?: string;

  constructor(
    message: string,
    options: {
      status?: number;
      detail?: string;
      prNumber?: number;
      prUrl?: string;
    } = {},
  ) {
    super(message);
    this.name = "ReviewLoadError";
    Object.assign(this, options);
  }
}

const fetchPack = async (url: string) => {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    let detail = "";
    try {
      const payload = (await response.json()) as { error?: unknown };
      detail = typeof payload.error === "string" ? payload.error : "";
    } catch {
      detail = "";
    }
    throw new ReviewLoadError(`PR evidence request failed (${response.status})`, {
      status: response.status,
      detail,
    });
  }
  return (await response.json()) as ReviewPack;
};

const withSource = (error: unknown, source: RuntimeSource) => {
  const failure =
    error instanceof ReviewLoadError
      ? error
      : new ReviewLoadError(
          error instanceof Error ? error.message : String(error),
        );
  return new ReviewLoadError(failure.message, {
    status: failure.status,
    detail: failure.detail,
    prNumber: source.pr,
    prUrl: source.url,
  });
};

const parseRepository = (source: RuntimeSource) => {
  if (source.url) return new URL(source.url);
  if (/^https?:\/\//.test(source.repository)) return new URL(source.repository);
  return new URL(
    `https://github.com/${source.repository.replace(/^\/+|\/+$/g, "")}`,
  );
};

const loadPublicGitHub = async (source: RuntimeSource): Promise<ReviewPack> => {
  const parsed = parseRepository(source);
  if (parsed.hostname !== "github.com") {
    throw new Error(
      "Enterprise repositories require a same-origin endpoint in runtime/source.json",
    );
  }
  const [owner, repoPart] = parsed.pathname.split("/").filter(Boolean);
  const repo = repoPart?.replace(/\.git$/, "");
  if (!owner || !repo)
    throw new Error("runtime source must identify a repository");

  const headers = { Accept: "application/vnd.github+json" };
  const apiRoot = `https://api.github.com/repos/${owner}/${repo}/pulls/${source.pr}`;
  const metadata = await fetch(apiRoot, { headers });
  if (!metadata.ok)
    throw new Error(`PR metadata request failed (${metadata.status})`);
  const pr = (await metadata.json()) as Record<string, any>;
  const apiFiles: Array<Record<string, unknown>> = [];
  for (let page = 1; ; page += 1) {
    const filesResponse = await fetch(
      `${apiRoot}/files?per_page=100&page=${page}`,
      { headers },
    );
    if (!filesResponse.ok)
      throw new Error(`PR files request failed (${filesResponse.status})`);
    const pageFiles = (await filesResponse.json()) as Array<
      Record<string, unknown>
    >;
    apiFiles.push(...pageFiles);
    if (pageFiles.length < 100) break;
  }
  const files = apiFiles.map((file) => ({
    path: String(file.filename ?? ""),
    status: String(file.status ?? "M"),
    additions: Number(file.additions ?? 0),
    deletions: Number(file.deletions ?? 0),
    diff: String(
      file.patch ?? "(Patch unavailable from the API for this file.)",
    ),
  }));

  return {
    repository: `${owner}/${repo}`,
    pr: {
      number: Number(pr.number),
      title: String(pr.title),
      url: String(pr.html_url ?? source.url ?? ""),
      baseRefName: String(pr.base?.ref ?? ""),
      headRefName: String(pr.head?.ref ?? ""),
      baseRefOid: String(pr.base?.sha ?? ""),
      headRefOid: String(pr.head?.sha ?? ""),
      additions: Number(pr.additions ?? 0),
      deletions: Number(pr.deletions ?? 0),
      changedFiles: Number(pr.changed_files ?? files.length),
      body: String(pr.body ?? ""),
      author: pr.user
        ? { login: String(pr.user.login ?? ""), name: String(pr.user.name ?? "") }
        : undefined,
      comments: Number(pr.comments ?? 0),
      reviewComments: Number(pr.review_comments ?? 0),
      createdAt: String(pr.created_at ?? ""),
      updatedAt: String(pr.updated_at ?? ""),
      state: String(pr.state ?? "").toUpperCase(),
      isDraft: Boolean(pr.draft),
    },
    files,
  };
};

export const loadReviewPack = async (): Promise<ReviewPack> => {
  const sourceResponse = await fetch("./runtime/source.json", {
    headers: { Accept: "application/json" },
  });
  if (!sourceResponse.ok) return fetchPack("./evidence/pr.json");

  const source = (await sourceResponse.json()) as RuntimeSource;
  if (source.endpoint) {
    const endpoint = new URL(source.endpoint, window.location.href);
    if (endpoint.origin !== window.location.origin) {
      throw new Error("runtime source endpoint must be same-origin");
    }
    try {
      return await fetchPack(endpoint.href);
    } catch (error) {
      throw withSource(error, source);
    }
  }
  return loadPublicGitHub(source);
};
