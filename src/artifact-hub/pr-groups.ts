import type { ArtifactRecord } from "./catalog";
import { sourceNumber, sourceString } from "./catalog";
import type { PrCatalogSnapshot, PrCatalogSummary } from "./pr-summary-api";

export type PrIdentity = {
  key: string;
  host: string;
  repository: string;
  number: number;
};

export type PrGroup = {
  id: string;
  identity?: PrIdentity;
  project: string;
  records: ArtifactRecord[];
  summary?: PrCatalogSummary;
  freshness?: PrCatalogSnapshot["freshness"];
};

export type PrGroupResolution = {
  groups: PrGroup[];
  recordToGroup: Map<string, string>;
};

export function mergedPrArtifactIds(groups: PrGroup[]): Set<string> {
  return new Set(
    groups.flatMap((group) => {
      const merged =
        group.summary?.pr.state.toUpperCase() === "MERGED" ||
        group.records.some((record) => record.status === "merged");
      return merged
        ? group.records.map((record) => record.artifact.manifest.id)
        : [];
    }),
  );
}

function repositoryPath(value: string): string | undefined {
  const normalized = value.replace(/^\/+|\/+$/g, "").replace(/\.git$/i, "");
  return normalized || undefined;
}

function identityFromUrl(
  value: string | undefined,
  fallbackNumber?: number,
  fallbackRepository?: string,
): PrIdentity | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    const pullMatch = url.pathname.match(/^\/(.+?)\/pull\/(\d+)(?:\/|$)/i);
    const number = pullMatch ? Number(pullMatch[2]) : fallbackNumber;
    const repository = repositoryPath(
      pullMatch?.[1] ?? fallbackRepository ?? url.pathname,
    );
    if (!url.host || !repository || number === undefined) return undefined;
    const host = url.host.toLowerCase();
    const normalizedRepository = repository.toLowerCase();
    return {
      key: `${host}/${normalizedRepository}#${number}`,
      host,
      repository: normalizedRepository,
      number,
    };
  } catch {
    return undefined;
  }
}

export function prIdentity(
  record: ArtifactRecord,
  summary?: PrCatalogSummary,
): PrIdentity | undefined {
  if (summary) {
    const live = identityFromUrl(
      summary.pr.url,
      summary.pr.number,
      summary.pr.baseRepository || summary.repository,
    );
    if (live) return live;
  }

  const number = sourceNumber(record.source, "pr");
  const sourceUrl = sourceString(record.source, "url") ?? record.sourceUrl;
  const fromPrUrl = identityFromUrl(sourceUrl, number);
  if (fromPrUrl) return fromPrUrl;
  return identityFromUrl(
    sourceString(record.source, "repository") ?? record.repository,
    number,
  );
}

export function groupPrRecords(
  records: ArtifactRecord[],
  snapshot: PrCatalogSnapshot | null,
): PrGroupResolution {
  const groupsByKey = new Map<string, PrGroup>();
  const recordToGroup = new Map<string, string>();

  for (const record of records) {
    if (record.kind !== "pr-review") continue;
    const artifactId = record.artifact.manifest.id;
    const summary = snapshot?.summaries[artifactId];
    const identity = prIdentity(record, summary);
    const key = identity?.key ?? `artifact:${artifactId}`;
    let group = groupsByKey.get(key);
    if (!group) {
      group = {
        id: `pr-group:${key}`,
        identity,
        project: record.project,
        records: [],
        summary,
        freshness: summary ? snapshot?.freshness : undefined,
      };
      groupsByKey.set(key, group);
    } else if (!group.summary && summary) {
      group.summary = summary;
      group.freshness = snapshot?.freshness;
    }
    group.records.push(record);
    recordToGroup.set(artifactId, group.id);
  }

  const groups = [...groupsByKey.values()];
  for (const group of groups) {
    group.records.sort(
      (left, right) =>
        Date.parse(right.artifact.manifest.createdAt) -
        Date.parse(left.artifact.manifest.createdAt),
    );
  }
  return { groups, recordToGroup };
}
