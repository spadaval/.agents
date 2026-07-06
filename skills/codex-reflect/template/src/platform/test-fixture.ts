import type { EvidencePack, RawEvidence, RunAnalysis } from './types';

const source = { path: '/tmp/rollout.jsonl', line: 10 };
function evidence(kind: string, id: string, sessionId: string, timestamp: string | null, data: Record<string, unknown>): RawEvidence {
  return { id, kind, sessionId, timestamp, source, excerpt: String(data.output || data.last_agent_message || ''), data };
}

export const fixturePack: EvidencePack = {
  schemaVersion: 5,
  discoverySessionId: '019f0000-0000-7000-8000-000000000001',
  primaryThreadId: '019f0000-0000-7000-8000-000000000001',
  generatedAt: '2026-07-01T00:00:00Z',
  report: { totals: {}, linkedSessionEvidence: [] },
  sessions: [
    {
      id: '019f0000-0000-7000-8000-000000000001', label: 'Deliver branch-aware missions', role: 'mission',
      assignment: 'Deliver branch-aware missions safely.', finalHandoff: 'Mission complete. `cargo test` passed.', status: 'completed',
      window: { start: '2026-06-30T10:00:00Z', end: '2026-06-30T11:00:00Z' }, sourceRollouts: ['/tmp/root.jsonl'],
      tokens: { total: 1000, input: 800, cachedInput: 500, uncachedInput: 300, output: 200, reasoning: 80 },
      modelUsage: { provider: 'openai', configurations: [{ model: 'gpt-5.5', effort: 'high', startedAt: '2026-06-30T10:00:01Z' }], tokensByModel: [{ model: 'gpt-5.5', snapshotCount: 4, total: 1000, input: 800, cachedInput: 500, uncachedInput: 300, output: 200, reasoning: 80 }] }
    },
    {
      id: '019f0000-0000-7000-8000-000000000002', role: 'review',
      finalHandoff: 'issue ID: atelier-abcd\nresult: review complete; no blockers.', status: 'completed',
      window: { start: '2026-06-30T10:10:00Z', end: '2026-06-30T10:40:00Z' }, sourceRollouts: ['/tmp/child.jsonl'],
      tokens: { total: 250, input: 200, cachedInput: 40, uncachedInput: 160, output: 50, reasoning: 15 },
      modelUsage: { provider: 'openai', configurations: [{ model: 'gpt-5.4-mini', effort: 'medium', startedAt: '2026-06-30T10:10:01Z' }], tokensByModel: [{ model: 'gpt-5.4-mini', snapshotCount: 2, total: 250, input: 200, cachedInput: 40, uncachedInput: 160, output: 50, reasoning: 15 }] }
    },
    {
      id: '019f0000-0000-7000-8000-000000000003', assignment: 'Validate the integration branch.', role: 'validation', status: 'blocked',
      window: { start: '2026-06-30T10:20:00Z', end: '2026-06-30T10:30:00Z' }, sourceRollouts: ['/tmp/validation.jsonl'],
      tokens: { total: 300, input: 240, cachedInput: 100, uncachedInput: 140, output: 60, reasoning: 20 },
      modelUsage: { provider: 'openai', configurations: [{ model: 'gpt-5.5', effort: 'high', startedAt: '2026-06-30T10:20:01Z' }], tokensByModel: [{ model: 'gpt-5.5', snapshotCount: 2, total: 300, input: 240, cachedInput: 100, uncachedInput: 140, output: 60, reasoning: 20 }] }
    }
  ],
  threadRelations: [],
  edges: [
    { parent: '019f0000-0000-7000-8000-000000000001', child: '019f0000-0000-7000-8000-000000000002', kind: 'spawned_subagent', timestamp: '2026-06-30T10:09:52Z', assignment: 'Review atelier-abcd', role: 'review' },
    { parent: '019f0000-0000-7000-8000-000000000001', child: '019f0000-0000-7000-8000-000000000003', kind: 'spawned_subagent', timestamp: null, assignment: 'Validate the integration branch.', role: 'validation' },
    { parent: '019f0000-0000-7000-8000-000000000002', child: '019f0000-0000-7000-8000-000000000003', kind: 'spawn_agent', timestamp: '2026-06-30T10:19:00Z' }
  ],
  evidence: [
    evidence('session_summary', 'session:root:summary', '019f0000-0000-7000-8000-000000000001', '2026-06-30T10:00:00Z', {}),
    evidence('user_message', 'user:root:10', '019f0000-0000-7000-8000-000000000001', '2026-06-30T10:04:00Z', { message: 'Please run `atelier check` before changing the workflow.' }),
    evidence('failure', 'failure:root:12', '019f0000-0000-7000-8000-000000000001', '2026-06-30T10:05:00Z', {
      cmd: 'atelier check mission', output: 'Chunk ID: abc123 Wall time: 0.1 seconds Process exited with code 2 Original token count: 5 Output: error: workflow is stale', line: 12,
      response_context: {
        next_agent_message: { message: 'I will refresh the workflow before retrying.' },
        next_action: { cmd: 'atelier doctor --fix', tool: 'exec_command' },
        follow_up: 'modified_retry', follow_up_outcome: 'no_failure_signal_observed'
      }
    }),
    evidence('patch', 'patch:root:20', '019f0000-0000-7000-8000-000000000001', '2026-06-30T10:06:00Z', { changes: ['/repo/src/workflow.rs'], success: true }),
    evidence('patch', 'patch:root:21', '019f0000-0000-7000-8000-000000000001', '2026-06-30T10:06:10Z', { changes: ['/repo/src/branch.rs'], success: true }),
    evidence('validation', 'validation:root:24', '019f0000-0000-7000-8000-000000000001', '2026-06-30T10:07:00Z', { command: 'cargo test', output: 'test result: ok' }),
    evidence('validation', 'validation:root:25', '019f0000-0000-7000-8000-000000000001', '2026-06-30T10:07:10Z', { command: 'atelier check', output: 'Lint passed.' }),
    evidence('patch', 'patch:root:26', '019f0000-0000-7000-8000-000000000001', '2026-06-30T10:07:20Z', { changes: ['/repo/src/proof.rs'], success: true }),
    evidence('turn', 'turn:root:1', '019f0000-0000-7000-8000-000000000001', '2026-06-30T10:08:00Z', { last_agent_message: 'Validation passed with `cargo test` and `atelier check`.' }),
    evidence('tool_count', 'tool:root:exec', '019f0000-0000-7000-8000-000000000001', '2026-06-30T11:00:00Z', { tool: 'exec_command', count: 14 }),
    evidence('session_summary', 'session:child:summary', '019f0000-0000-7000-8000-000000000002', '2026-06-30T10:10:00Z', {}),
    evidence('session_summary', 'session:validation:summary', '019f0000-0000-7000-8000-000000000003', '2026-06-30T10:20:00Z', {})
  ]
};

const rootId = '019f0000-0000-7000-8000-000000000001';
const reviewId = '019f0000-0000-7000-8000-000000000002';
const validationId = '019f0000-0000-7000-8000-000000000003';
const task = (title: string, objective: string, citation: string) => ({ title, objective, successCriteria: ['Behavior is verified'], issueReferences: [], citations: [{ evidenceId: citation }] });
const assessment = (outcome: 'succeeded' | 'failed', summary: string, citation: string) => ({ lifecycle: 'completed' as const, outcome, confidence: 'high' as const, summary, citations: [{ evidenceId: citation }] });
export const fixtureAnalysis: RunAnalysis = {
  version: 1, primarySessionId: rootId,
  task: task('Deliver branch-aware missions', 'Make mission branches safe and prove the workflow.', 'turn:root:1'),
  assessment: assessment('succeeded', 'The mission delivered the requested branch behavior.', 'turn:root:1'),
  summary: 'The run implemented and validated branch-aware mission behavior.',
  workstreams: [
    { sessionId: rootId, label: 'Deliver branch-aware missions', role: 'Mission lead', task: task('Deliver branch-aware missions', 'Make mission branches safe and prove the workflow.', 'user:root:10'), assessment: assessment('succeeded', 'The workflow passed validation.', 'turn:root:1'), summary: 'Implementation recovered from one stale-workflow failure.', actions: [
        { id: 'action-recovery', title: 'Recover from stale workflow', summary: 'The first mission check failed and the workflow was refreshed.', result: 'The retry completed.', significance: 'It unblocked implementation.', start: '2026-06-30T10:05:00Z', end: '2026-06-30T10:06:10Z', sessionIds: [reviewId], citations: [{ evidenceId: 'failure:root:12' }, { evidenceId: 'session:child:summary' }] },
        { id: 'action-validation', title: 'Validate the change', summary: 'Tests and Atelier checks ran.', result: 'Validation passed.', start: '2026-06-30T10:07:00Z', end: '2026-06-30T10:08:00Z', citations: [{ evidenceId: 'validation:root:24' }, { evidenceId: 'validation:root:25' }] }
      ], phases: [{ id: 'phase-implementation', title: 'Implement and verify', summary: 'The agent changed the workflow and ran validation.', start: '2026-06-30T10:04:00Z', end: '2026-06-30T10:08:00Z' }] },
    { sessionId: reviewId, label: 'Review branch behavior', role: 'Reviewer', task: task('Review implementation', 'Review branch behavior independently.', 'session:child:summary'), assessment: assessment('succeeded', 'Review completed without blockers.', 'session:child:summary'), summary: 'Independent review completed.', actions: [], phases: [] },
    { sessionId: validationId, label: 'Validate integration', role: 'Validator', task: task('Validate integration', 'Validate the integration branch.', 'session:validation:summary'), assessment: assessment('failed', 'Validation completed and found a failing condition.', 'session:validation:summary'), summary: 'Validation produced findings.', actions: [], phases: [] }
  ],
  crossThread: { summary: 'Implementation, review, and validation ran as separate workstreams.', outcomeSynthesis: 'The main task succeeded with a validation finding.',
    outcomeMatrix: [{ id: 'matrix-delivery', objective: 'Deliver branch-aware missions', sessionIds: [rootId, reviewId], result: 'Implemented and reviewed.', remainingRisk: 'Validation found one follow-up.', citations: [{ evidenceId: 'turn:root:1' }] }],
    failureThemes: [{ id: 'theme-stale', title: 'Stale workflow state', summary: 'One stale-state failure required recovery.', affectedSessionIds: [rootId], citations: [{ evidenceId: 'failure:root:12' }] }],
    delegationEffectiveness: 'Delegation separated review from implementation.', delegationCitations: [], resourceInterpretation: 'Runtime was concentrated in the primary session.', resourceCitations: [],
    gitSummary: 'No Git observations were present in this fixture.', gitObservations: [] }
};
