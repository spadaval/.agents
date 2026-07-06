import { describe, expect, it } from 'vitest';
import { deriveReport, readableToolOutput, sourcesInActionRange } from './report-model';
import { fixtureAnalysis, fixturePack } from './test-fixture';

describe('analyzed report model', () => {
  it('uses authored labels, roles, tasks, and separate lifecycle/outcome', () => {
    const report = deriveReport(fixturePack, fixtureAnalysis); const validation = report.byId.get('019f0000-0000-7000-8000-000000000003')!;
    expect(report.byId.get(report.rootId)?.label).toBe('Deliver branch-aware missions');
    expect(validation.label).toBe('Validate integration'); expect(validation.role).toBe('Validator');
    expect(validation.lifecycle).toBe('completed'); expect(validation.outcome).toBe('failed');
  });
  it('uses neutral values instead of regex inference when analysis is absent', () => {
    const empty = { ...fixtureAnalysis, primarySessionId: fixturePack.primaryThreadId!, workstreams: [] };
    const child = deriveReport(fixturePack, empty).byId.get('019f0000-0000-7000-8000-000000000002')!;
    expect(child.label).toBe('Session 00000002'); expect(child.role).toBe('Unclassified'); expect(child.outcome).toBe('unknown');
  });
  it('preserves exact delegation time, cross-links, and cited phases', () => {
    const report = deriveReport(fixturePack, fixtureAnalysis); const validation = report.byId.get('019f0000-0000-7000-8000-000000000003')!;
    expect(report.byId.get('019f0000-0000-7000-8000-000000000002')?.parentEdge?.timestamp).toBe('2026-06-30T10:09:52Z');
    expect(validation.parentEdge?.timestamp).toBeNull(); expect(validation.crossLinkParentIds).toEqual(['019f0000-0000-7000-8000-000000000002']);
    expect(report.byId.get(report.rootId)?.actions[0].citations[0].evidenceId).toBe('failure:root:12');
  });
  it('keeps raw normalized records available and strips runner metadata', () => {
    const root = deriveReport(fixturePack, fixtureAnalysis).byId.get(fixturePack.primaryThreadId!)!;
    expect(root.sources).toHaveLength(10); expect(root.events.map((event) => event.kind)).toContain('user_message');
    expect(readableToolOutput('Chunk ID: abc Wall time: 0.1 seconds Process exited with code 2 Output: error: bad command')).toBe('error: bad command');
  });
  it('computes resource statistics with recorded denominators', () => {
    const stats = deriveReport(fixturePack, fixtureAnalysis).resourceStatistics;
    expect(stats.duration.count).toBe(3); expect(stats.duration.total).toBe(6000); expect(stats.tokens.count).toBe(3); expect(stats.tokens.total).toBe(1550);
  });
  it('aggregates attributed tokens by actual model and preserves effort', () => {
    const report = deriveReport(fixturePack, fixtureAnalysis);
    expect(report.modelStatistics.map((item) => [item.model, item.total, item.sessionIds.length])).toEqual([
      ['gpt-5.5', 1300, 2], ['gpt-5.4-mini', 250, 1],
    ]);
    expect(report.modelStatistics[0].efforts).toEqual(['high']);
    expect(report.byId.get(report.rootId)?.modelUsage.configurations[0].model).toBe('gpt-5.5');
  });
  it('keeps a thread creator reachable as a peer rather than a workstream parent', () => {
    const sourceId = '019f0000-0000-7000-8000-000000000000'; const pack = { ...fixturePack, discoverySessionId: sourceId, sessions: [{ id: sourceId, window: { start: '2026-06-30T09:00:00Z', end: '2026-06-30T09:10:00Z' } }, ...fixturePack.sessions], threadRelations: [{ from: sourceId, to: fixturePack.primaryThreadId!, kind: 'create_thread', timestamp: '2026-06-30T09:10:00Z' }] }; const sourceAnalysis = { ...fixtureAnalysis, workstreams: [{ sessionId: sourceId, label: 'Related setup thread', role: 'Initiator', task: { title: 'Start mission', objective: 'Create the mission session.', successCriteria: [], issueReferences: [], citations: [] }, assessment: { lifecycle: 'completed' as const, outcome: 'succeeded' as const, confidence: 'high' as const, summary: 'Created.', citations: [] }, summary: 'Created the mission.', actions: [], phases: [] }, ...fixtureAnalysis.workstreams] };
    const report = deriveReport(pack, sourceAnalysis); expect(report.rootId).toBe(fixturePack.primaryThreadId); expect(report.workstreams).toHaveLength(4); expect(report.byId.get(sourceId)?.isThreadRoot).toBe(true); expect(report.byId.get(report.rootId)?.parentId).toBeNull(); expect(report.byId.get(report.rootId)?.isPrimaryThread).toBe(true); expect(report.threadRelations[0].from).toBe(sourceId); expect(report.resourceStatistics.duration.count).toBe(4);
  });
  it('assigns every normalized event in an action time range regardless of citations', () => {
    const report = deriveReport(fixturePack, fixtureAnalysis); const root = report.byId.get(report.rootId)!; const owned = sourcesInActionRange(root.actions[0], root.sources);
    expect(owned.map((source) => source.evidenceId)).toEqual(['failure:root:12', 'patch:root:20', 'patch:root:21']);
  });
});
