export type ReportRoute =
  | { page: 'analysis'; sourceId: string }
  | { page: 'workstream'; workstreamId: string; sourceId: string }
  | { page: 'legacy'; evidenceId: string }
  | { page: 'default' };

export function parseReportHash(hash: string): ReportRoute {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (parts[0] === 'analysis') return { page: 'analysis', sourceId: parts[1] === 'source' ? parts.slice(2).join('/') : '' };
  if (parts[0] === 'workstream') return { page: 'workstream', workstreamId: parts[1] || '', sourceId: parts[2] === 'source' ? parts.slice(3).join('/') : '' };
  if (parts[0] === 'evidence') return { page: 'legacy', evidenceId: parts.slice(1).join('/') };
  return { page: 'default' };
}
export const analysisHash = (sourceId = '') => `#/analysis${sourceId ? `/source/${encodeURIComponent(sourceId)}` : ''}`;
export const workstreamHash = (workstreamId: string, sourceId = '') => `#/workstream/${encodeURIComponent(workstreamId)}${sourceId ? `/source/${encodeURIComponent(sourceId)}` : ''}`;
export const legacyEvidenceDestination = (evidenceId: string, owners: Map<string, string>, rootId: string) => workstreamHash(owners.get(evidenceId) || rootId, evidenceId);
