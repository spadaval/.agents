import type { ArtifactRecord } from "./catalog";
import { sourceString } from "./catalog";
import type { PrCatalogSummary } from "./pr-summary-api";

export type PrArtifactStaleness = {
  stale: boolean;
  recordedHead?: string;
  currentHead?: string;
};

export function prArtifactStaleness(
  record: ArtifactRecord,
  summary?: PrCatalogSummary,
): PrArtifactStaleness {
  const recordedHead = sourceString(record.source, "head")?.trim();
  const currentHead = summary?.pr.headRefOid?.trim();
  return {
    stale: Boolean(recordedHead && currentHead && recordedHead !== currentHead),
    recordedHead: recordedHead || undefined,
    currentHead: currentHead || undefined,
  };
}
