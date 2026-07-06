import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ActivityItem from './ActivityItem.svelte';
import Markdown from './Markdown.svelte';
import SourceDrawer from './SourceDrawer.svelte';
import WorkstreamCaseFile from './WorkstreamCaseFile.svelte';
import WorkstreamTree from './WorkstreamTree.svelte';
import TestCustomSection from './TestCustomSection.svelte';
import CrossThreadPage from './CrossThreadPage.svelte';
import { deriveReport } from './report-model';
import { fixtureAnalysis, fixturePack } from './test-fixture';

afterEach(cleanup);
describe('analyzed viewer', () => {
  it('uses the authored workstream tree for orientation and cross-links', async () => {
    const report = deriveReport(fixturePack, fixtureAnalysis); const onSelect = vi.fn();
    const onAnalysis = vi.fn(); render(WorkstreamTree, { report, selectedId: report.rootId, onAnalysis, onSelect });
    expect(screen.getByText('Review branch behavior')).toBeTruthy(); expect(screen.getByTitle('Linked from another workstream')).toBeTruthy();
    await fireEvent.click(screen.getByText('Validate integration')); expect(onSelect).toHaveBeenCalledWith('019f0000-0000-7000-8000-000000000003');
  });
  it('shows thread peers at the same level and orders roots and children chronologically', () => {
    const sourceId = '019f0000-0000-7000-8000-000000000000';
    const pack = { ...fixturePack, discoverySessionId: sourceId, sessions: [{ id: sourceId, window: { start: '2026-06-30T09:00:00Z', end: '2026-06-30T09:10:00Z' } }, ...fixturePack.sessions], threadRelations: [{ from: sourceId, to: fixturePack.primaryThreadId!, kind: 'create_thread', timestamp: '2026-06-30T09:10:00Z' }] };
    const analysis = { ...fixtureAnalysis, workstreams: [{ sessionId: sourceId, label: 'Related setup thread', role: 'Initiator', task: { title: 'Start mission', objective: 'Create the mission session.', successCriteria: [], issueReferences: [], citations: [] }, assessment: { lifecycle: 'completed' as const, outcome: 'succeeded' as const, confidence: 'high' as const, summary: 'Created.', citations: [] }, summary: 'Created the mission.', actions: [], phases: [] }, ...fixtureAnalysis.workstreams] };
    const report = deriveReport(pack, analysis); const { container } = render(WorkstreamTree, { report, selectedId: report.rootId, onAnalysis: vi.fn(), onSelect: vi.fn() });
    expect([...container.querySelectorAll('.node-label')].map((item) => item.textContent)).toEqual(['Related setup thread', 'Deliver branch-aware missions', 'Review branch behavior', 'Validate integration']);
    const levels = [...container.querySelectorAll('[role="treeitem"]')].map((item) => item.getAttribute('aria-level')); expect(levels).toEqual(['1', '1', '2', '2']);
    expect(screen.getByText('Primary thread')).toBeTruthy(); expect(screen.getByText('Related thread')).toBeTruthy();
  });
  it('keeps the root case focused on one phase-grouped Activity stream and resources', () => {
    const report = deriveReport(fixturePack, fixtureAnalysis); const { container } = render(WorkstreamCaseFile, { workstream: report.byId.get(report.rootId)!, report, onSource: vi.fn(), onSelect: vi.fn() });
    expect(screen.getByText('Activity')).toBeTruthy(); expect(screen.getByText('Implement and verify')).toBeTruthy(); expect(screen.queryByText('Outcome matrix')).toBeNull(); expect(screen.queryByText('Common failure themes')).toBeNull();
    expect(screen.getByText('Files changed')).toBeTruthy(); expect(container.querySelector('.resource-strip')?.textContent).toContain('Files changed3'); expect(screen.getByText('gpt-5.5')).toBeTruthy(); expect(screen.getByText('high effort')).toBeTruthy(); expect(screen.getByText('Session #00000001')).toBeTruthy(); expect(screen.queryByText(/^Source /)).toBeNull(); expect(container.querySelector('details.raw-appendix')).toBeNull(); expect(container.textContent).not.toContain('Other recorded events');
  });
  it('nests range-owned events, highlights citations, and interleaves unowned runs chronologically', async () => {
    const report = deriveReport(fixturePack, fixtureAnalysis); const { container } = render(WorkstreamCaseFile, { workstream: report.byId.get(report.rootId)!, report, onSource: vi.fn(), onSelect: vi.fn() });
    const text = container.textContent || ''; expect(text.indexOf('Recorded Jun 30, 6:04 AM')).toBeLessThan(text.indexOf('Recover from stale workflow')); expect(text.indexOf('Recover from stale workflow')).toBeLessThan(text.indexOf('Validate the change'));
    const owned = screen.getByText('3 events'); const details = owned.closest('details') as HTMLDetailsElement; expect(details?.textContent).toContain('2 files'); expect(details?.textContent).toContain('1 failure'); details.open = true; await fireEvent(details, new Event('toggle')); await waitFor(() => expect(container.querySelectorAll('.raw-evidence-row').length).toBeGreaterThanOrEqual(3)); expect(container.querySelector('.raw-evidence-row.highlighted')).toBeTruthy(); expect(screen.getByText('2 file edits')).toBeTruthy(); expect(screen.getByText('+6m–+6m 10s')).toBeTruthy();
    expect(screen.getByText('Linked · 1 event')).toBeTruthy(); expect(text).not.toContain('Other recorded events');
  });
  it('shows complete ancestor breadcrumbs and additional DAG parents', () => {
    const report = deriveReport(fixturePack, fixtureAnalysis); render(WorkstreamCaseFile, { workstream: report.byId.get('019f0000-0000-7000-8000-000000000003')!, report, onSource: vi.fn(), onSelect: vi.fn() });
    expect(screen.getByLabelText('Workstream ancestors').textContent).toContain('Deliver branch-aware missions'); expect(screen.getByText('Additional parents')).toBeTruthy(); expect(screen.getByText('Session #00000003')).toBeTruthy();
  });
  it('keeps initial Git identity quiet and contextual instead of rendering a standalone section', () => {
    const pack = { ...fixturePack, sessions: fixturePack.sessions.map((session) => session.id === fixturePack.primaryThreadId ? { ...session, git: { initial: { branch: 'codex/refine-viewer', commit_hash: 'abcdef1234567890' }, observations: [{ operation: 'commit', subject: 'Refine viewer' }] } } : session) };
    const report = deriveReport(pack, fixtureAnalysis); const { container } = render(WorkstreamCaseFile, { workstream: report.byId.get(report.rootId)!, report, onSource: vi.fn(), onSelect: vi.fn() });
    expect(screen.getByText('codex/refine-viewer')).toBeTruthy(); expect(screen.getByText('@ abcdef1234')).toBeTruthy(); expect(container.querySelector('.session-git')).toBeNull(); expect(container.textContent).not.toContain('Captured Git context');
  });
  it('keeps raw source structured and closed by default', () => {
    const source = deriveReport(fixturePack, fixtureAnalysis).sourceByEvidence.get('failure:root:12')!; render(SourceDrawer, { source, onClose: vi.fn() });
    expect(screen.getByTestId('source-drawer')).toBeTruthy(); expect(screen.getByText('Raw event data')).toBeTruthy();
  });
  it('still renders low-level failure detail without runner metadata', () => {
    const report = deriveReport(fixturePack, fixtureAnalysis); render(ActivityItem, { event: report.byId.get(report.rootId)!.failures[0], report, onSource: vi.fn(), onSelect: vi.fn() });
    expect(screen.getByText('error: workflow is stale')).toBeTruthy(); expect(screen.queryByText(/Chunk ID/)).toBeNull();
  });
  it('sanitizes Markdown', () => { const { container } = render(Markdown, { content: '- **safe**\n<script>bad()</script>' }); expect(container.querySelector('strong')?.textContent).toBe('safe'); expect(container.querySelector('script')).toBeNull(); });
  it('renders report-local custom sections with report, evidence, and workstream context', () => {
    const analysis = { ...fixtureAnalysis, customSections: [{ id: 'fixture-custom', placement: 'root-after-summary' as const, component: TestCustomSection }] };
    const report = deriveReport(fixturePack, analysis); render(WorkstreamCaseFile, { workstream: report.byId.get(report.rootId)!, report, onSource: vi.fn(), onSelect: vi.fn() });
    expect(screen.getByTestId('custom-section').textContent).toContain('3 workstreams · 3 sessions · 00000001');
  });
  it('renders cross-thread findings on a separate report page and exposes sidebar navigation', async () => {
    const report = deriveReport(fixturePack, fixtureAnalysis); const onAnalysis = vi.fn(); const { unmount } = render(WorkstreamTree, { report, selectedId: report.rootId, onAnalysis, onSelect: vi.fn() }); await fireEvent.click(screen.getByText('Cross-thread analysis')); expect(onAnalysis).toHaveBeenCalled(); unmount();
    render(CrossThreadPage, { report, onSource: vi.fn(), onSelect: vi.fn() }); expect(screen.getByText('Outcome matrix')).toBeTruthy(); expect(screen.getByText('Resource distribution')).toBeTruthy(); expect(screen.getByText('Attributed tokens by model')).toBeTruthy(); expect(screen.getByText('gpt-5.4-mini')).toBeTruthy(); expect(screen.queryByText('Observed Git flow')).toBeNull();
  });
});
