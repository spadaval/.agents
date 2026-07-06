import { describe, expect, it } from 'vitest';
import { analysisHash, legacyEvidenceDestination, parseReportHash, workstreamHash } from './routes';

describe('report hash routing', () => {
  it('preserves analysis context for source drawers', () => { const hash = analysisHash('failure:root:12'); expect(hash).toBe('#/analysis/source/failure%3Aroot%3A12'); expect(parseReportHash(hash)).toEqual({ page: 'analysis', sourceId: 'failure:root:12' }); });
  it('preserves workstream source links and legacy evidence routes', () => { expect(parseReportHash(workstreamHash('session-1', 'source/one'))).toEqual({ page: 'workstream', workstreamId: 'session-1', sourceId: 'source/one' }); expect(parseReportHash('#/evidence/old%3Aid')).toEqual({ page: 'legacy', evidenceId: 'old:id' }); });
  it('redirects legacy evidence to the owning workstream source', () => expect(legacyEvidenceDestination('failure:12', new Map([['failure:12', 'session-2']]), 'root')).toBe('#/workstream/session-2/source/failure%3A12'));
});
