import type {
  Action, ChangeEvent, DelegationEdge, DelegationEvent, EvidencePack, FailureEvent, RawEvidence,
  ModelStatistic, RawSession, ReportViewModel, ResourceStatistic, RunAnalysis, SessionModelUsage, SourceReference, TokenUsage,
  ValidationEvent, Workstream, WorkstreamAnalysis, WorkstreamEvent
} from './types';

const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';
const record = (value: unknown): Record<string, unknown> => value && typeof value === 'object' ? value as Record<string, unknown> : {};
const time = (value: string | null): number => value && !Number.isNaN(Date.parse(value)) ? Date.parse(value) : Number.MAX_SAFE_INTEGER;
const compareEvents = (a: WorkstreamEvent, b: WorkstreamEvent): number => time(a.timestamp) - time(b.timestamp) || a.id.localeCompare(b.id);
const neutralTask = (id: string) => ({ title: `Session ${id.slice(-8)}`, objective: '', successCriteria: [], issueReferences: [], citations: [] });
const neutralAssessment = () => ({ lifecycle: 'unknown' as const, outcome: 'unknown' as const, confidence: 'low' as const, summary: 'No analysis has been authored for this session.', citations: [] });

function sourceFor(item: RawEvidence, sessionStart: string | null = null): SourceReference {
  return { evidenceId: item.id, sessionId: item.sessionId, timestamp: item.timestamp, path: text(item.source.path),
    paths: Array.isArray(item.source.paths) ? item.source.paths.map(String) : undefined,
    line: typeof item.source.line === 'number' || typeof item.source.line === 'string' ? item.source.line : undefined, sessionStart, raw: item };
}

export function readableToolOutput(value: string): string {
  let result = value.trim();
  const wrapped = result.match(/(?:^|\s)(?:Final output|Output):\s*([\s\S]*)$/i);
  if (wrapped?.[1]) result = wrapped[1].trim();
  return result.replace(/^Chunk ID:\s*\S+\s*/i, '').replace(/^Wall time:\s*[^\n]+\s*/i, '')
    .replace(/^Process exited with code\s+\d+\s*/i, '').replace(/^Original output:\s*/i, '')
    .replace(/^Original token count:\s*\d+\s*/i, '').trim() || 'The action did not complete successfully.';
}

function failureEvent(item: RawEvidence, sessionStart: string | null): FailureEvent {
  const context = record(item.data.response_context); const nextMessage = record(context.next_agent_message); const nextAction = record(context.next_action);
  const output = readableToolOutput(text(item.data.stderr) || text(item.data.output) || item.excerpt);
  const outcomeKey = text(context.follow_up_outcome);
  const source = sourceFor(item, sessionStart);
  return { id: item.id, kind: 'failure', timestamp: item.timestamp, title: 'Failure signal', summary: output, source, sources: [source],
    command: text(item.data.cmd) || text(item.data.name) || 'Recorded action', error: output,
    response: text(nextMessage.message) || text(context.follow_up).replaceAll('_', ' '),
    followUpAction: text(nextAction.cmd) || text(nextAction.tool) || text(nextAction.kind),
    outcome: outcomeKey === 'no_failure_signal_observed' ? 'Follow-up completed without another failure signal.'
      : outcomeKey === 'failure_signal_observed' ? 'The follow-up produced another failure signal.'
        : outcomeKey === 'outcome_unobserved' ? 'The follow-up result was not captured.'
          : outcomeKey ? outcomeKey.replaceAll('_', ' ') : 'No follow-up result was recorded.' };
}
function changeEvent(item: RawEvidence, sessionStart: string | null): ChangeEvent {
  const paths = Array.isArray(item.data.changes) ? item.data.changes.map(String) : []; const source = sourceFor(item, sessionStart);
  return { id: item.id, kind: 'change', timestamp: item.timestamp, title: paths.length === 1 ? 'Changed one path' : `Changed ${paths.length} paths`,
    summary: paths.join(', ') || 'A patch was recorded.', paths, success: typeof item.data.success === 'boolean' ? item.data.success : null, patchCount: 1, source, sources: [source] };
}
function validationEvent(item: RawEvidence, sessionStart: string | null): ValidationEvent {
  const command = text(item.data.command) || text(item.data.cmd); const output = text(item.data.output); const source = sourceFor(item, sessionStart);
  return { id: item.id, kind: 'validation', timestamp: item.timestamp, title: 'Ran a command', summary: command,
    commands: command ? [command] : [], outputs: output ? [readableToolOutput(output)] : [], source, sources: [source] };
}
function messageEvent(item: RawEvidence, user: boolean, sessionStart: string | null): WorkstreamEvent {
  const source = sourceFor(item, sessionStart); const summary = user ? text(item.data.message) || item.excerpt : text(item.data.last_agent_message) || item.excerpt;
  return { id: item.id, kind: user ? 'user_message' : 'message', timestamp: item.timestamp, title: user ? 'User message' : 'Agent message', summary, source, sources: [source] };
}
function toolEvent(item: RawEvidence, sessionStart: string | null): WorkstreamEvent {
  const source = sourceFor(item, sessionStart); const name = text(item.data.name) || text(item.data.tool) || text(item.data.command) || text(item.data.cmd) || 'Tool call';
  return { id: item.id, kind: 'tool', timestamp: item.timestamp, title: name, summary: text(item.data.output) || item.excerpt, source, sources: [source] };
}

function normalizedTokens(session: RawSession): TokenUsage {
  const tokens = session.tokenUsage || session.tokens || {}; const metrics = session.metrics || {};
  const number = (...values: unknown[]): number | null => { const value = values.find((item) => typeof item === 'number'); return typeof value === 'number' ? value : null; };
  const input = number(tokens.input, tokens.input_tokens, metrics.input_tokens);
  const cached = number(tokens.cachedInput, tokens.cached_input_tokens, metrics.cached_input_tokens);
  const uncached = number(tokens.uncachedInput, tokens.uncached_input_tokens, metrics.uncached_input_tokens, input != null && cached != null ? input - cached : null);
  const output = number(tokens.output, tokens.output_tokens, metrics.output_tokens);
  const reasoning = number(tokens.reasoning, tokens.reasoning_output_tokens, metrics.reasoning_output_tokens);
  return { total: number(tokens.total, tokens.total_tokens, metrics.total_tokens, input != null && output != null ? input + output : null), input, cachedInput: cached, uncachedInput: uncached, output, reasoning };
}
function normalizedModelUsage(session: RawSession): SessionModelUsage {
  const configurations = (session.modelUsage?.configurations || []).map((item) => ({
    model: text(item.model) || 'unknown', effort: text(item.effort) || null,
    startedAt: item.startedAt || null, source: item.source,
  }));
  const tokensByModel = (session.modelUsage?.tokensByModel || []).map((item) => ({
    model: text(item.model) || 'unknown', snapshotCount: typeof item.snapshotCount === 'number' ? item.snapshotCount : 0,
    total: typeof item.total === 'number' ? item.total : 0, input: typeof item.input === 'number' ? item.input : 0,
    cachedInput: typeof item.cachedInput === 'number' ? item.cachedInput : 0, uncachedInput: typeof item.uncachedInput === 'number' ? item.uncachedInput : 0,
    output: typeof item.output === 'number' ? item.output : 0, reasoning: typeof item.reasoning === 'number' ? item.reasoning : 0,
  }));
  return { provider: text(session.modelUsage?.provider) || null, configurations, tokensByModel };
}
function aggregateModels(workstreams: Workstream[]): ModelStatistic[] {
  const totals = new Map<string, ModelStatistic>();
  for (const workstream of workstreams) for (const usage of workstream.modelUsage.tokensByModel) {
    const current = totals.get(usage.model) || { model: usage.model, sessionIds: [], efforts: [], providers: [], snapshotCount: 0, total: 0, input: 0, cachedInput: 0, uncachedInput: 0, output: 0, reasoning: 0 };
    if (!current.sessionIds.includes(workstream.id)) current.sessionIds.push(workstream.id);
    for (const configuration of workstream.modelUsage.configurations.filter((item) => item.model === usage.model)) if (configuration.effort && !current.efforts.includes(configuration.effort)) current.efforts.push(configuration.effort);
    if (workstream.modelUsage.provider && !current.providers.includes(workstream.modelUsage.provider)) current.providers.push(workstream.modelUsage.provider);
    current.snapshotCount += usage.snapshotCount; current.total! += usage.total || 0; current.input! += usage.input || 0;
    current.cachedInput! += usage.cachedInput || 0; current.uncachedInput! += usage.uncachedInput || 0;
    current.output! += usage.output || 0; current.reasoning! += usage.reasoning || 0; totals.set(usage.model, current);
  }
  return [...totals.values()].sort((left, right) => (right.total || 0) - (left.total || 0) || left.model.localeCompare(right.model));
}
function duration(session: RawSession): number | null {
  if (typeof session.window?.durationSeconds === 'number') return session.window.durationSeconds;
  return session.window?.start && session.window?.end ? Math.max(0, (Date.parse(session.window.end) - Date.parse(session.window.start)) / 1000) : null;
}
function statistic(values: Array<number | null>): ResourceStatistic {
  const found = values.filter((value): value is number => typeof value === 'number').sort((a, b) => a - b);
  const total = found.reduce((sum, value) => sum + value, 0); const middle = Math.floor(found.length / 2);
  return { count: found.length, missing: values.length - found.length, total, mean: found.length ? total / found.length : 0,
    median: found.length ? found.length % 2 ? found[middle] : (found[middle - 1] + found[middle]) / 2 : 0,
    min: found[0] || 0, max: found.at(-1) || 0 };
}
function primaryParents(sessions: RawSession[], edges: DelegationEdge[]): Map<string, DelegationEdge> {
  const known = new Set(sessions.map((session) => session.id)); const result = new Map<string, DelegationEdge>(); const children = new Set(edges.map((edge) => edge.child));
  const starts = new Map(sessions.map((session) => [session.id, session.window?.start || null]));
  const queue = sessions.filter((session) => !children.has(session.id)).sort((left, right) => time(left.window?.start || null) - time(right.window?.start || null)).map((session) => session.id);
  const reached = new Set(queue);
  while (queue.length) { const parent = queue.shift()!; const outgoing = edges.filter((edge) => edge.parent === parent).sort((left, right) => time(left.timestamp || starts.get(left.child) || null) - time(right.timestamp || starts.get(right.child) || null)); for (const edge of outgoing) if (known.has(edge.child) && !result.has(edge.child)) { result.set(edge.child, edge); if (!reached.has(edge.child)) { reached.add(edge.child); queue.push(edge.child); } } }
  for (const edge of edges) if (known.has(edge.parent) && known.has(edge.child) && !result.has(edge.child)) result.set(edge.child, edge);
  return result;
}

export function sourcesForAction(action: Action, report: ReportViewModel): SourceReference[] {
  return action.citations.map((citation) => report.sourceByEvidence.get(citation.evidenceId)).filter((source): source is SourceReference => Boolean(source));
}
export function sourcesInActionRange(action: Action, sources: SourceReference[]): SourceReference[] {
  const start = Date.parse(action.start); const end = Date.parse(action.end);
  if (Number.isNaN(start) || Number.isNaN(end)) return [];
  return sources.filter((source) => { if (!source.timestamp) return false; const value = Date.parse(source.timestamp); return !Number.isNaN(value) && value >= start && value <= end; });
}

export function deriveReport(pack: EvidencePack, analysis: RunAnalysis): ReportViewModel {
  const requestedRoot = analysis.primarySessionId || pack.primaryThreadId || pack.discoverySessionId;
  const rootId = pack.sessions.some((session) => session.id === requestedRoot) ? requestedRoot : pack.discoverySessionId;
  const sessions = pack.sessions; const visible = new Set(sessions.map((session) => session.id)); const parents = primaryParents(sessions, pack.edges);
  const rawBySession = new Map<string, RawEvidence[]>(); for (const item of pack.evidence) { const items = rawBySession.get(item.sessionId) || []; items.push(item); rawBySession.set(item.sessionId, items); }
  const analyses = new Map(analysis.workstreams.map((item) => [item.sessionId, item]));
  if (!analyses.has(rootId) && analysis.primarySessionId === rootId) analyses.set(rootId, { sessionId: rootId, label: analysis.task.title, role: 'Primary', task: analysis.task, assessment: analysis.assessment, summary: analysis.summary, actions: [], phases: [] });
  const workstreams: Workstream[] = sessions.map((session) => {
    const raw = rawBySession.get(session.id) || []; const authored: WorkstreamAnalysis | undefined = analyses.get(session.id); const parentEdge = parents.get(session.id) || null; const sessionStart = session.window?.start || null;
    const failures = raw.filter((item) => item.kind === 'failure').map((item) => failureEvent(item, sessionStart)); const changes = raw.filter((item) => item.kind === 'patch').map((item) => changeEvent(item, sessionStart));
    const validations = raw.filter((item) => item.kind === 'validation').map((item) => validationEvent(item, sessionStart));
    const events = [...raw.filter((item) => item.kind === 'user_message' && item.data.humanVisible !== false).map((item) => messageEvent(item, true, sessionStart)), ...raw.filter((item) => item.kind === 'turn').map((item) => messageEvent(item, false, sessionStart)), ...failures, ...changes, ...validations,
      ...raw.filter((item) => ['tool_call', 'tool_interaction', 'interaction'].includes(item.kind) && !Array.isArray(item.data.derivedEvidenceIds) && item.data.derived !== true).map((item) => toolEvent(item, sessionStart))].sort(compareEvents);
    const assessment = authored?.assessment || neutralAssessment(); const task = authored?.task || neutralTask(session.id);
    return { id: session.id, shortId: session.id.slice(-8), label: authored?.label || `Session ${session.id.slice(-8)}`, role: authored?.role || 'Unclassified',
      lifecycle: assessment.lifecycle, outcome: assessment.outcome, assessment, task, analysisSummary: authored?.summary || '', actions: authored?.actions || [], phases: authored?.phases || [],
      parentId: parentEdge?.parent || null, parentEdge, childIds: [], crossLinkParentIds: pack.edges.filter((edge) => edge.child === session.id && edge !== parentEdge && edge.parent !== parentEdge?.parent).map((edge) => edge.parent),
      isThreadRoot: !parentEdge, isPrimaryThread: session.id === rootId,
      start: session.window?.start || null, end: session.window?.end || null,
      resources: { durationSeconds: duration(session), toolCalls: typeof session.metrics?.tool_call_count === 'number' ? session.metrics.tool_call_count : null, tokens: normalizedTokens(session) },
      modelUsage: normalizedModelUsage(session),
      git: { initial: session.git?.initial ? { repositoryUrl: text(session.git.initial.repository_url), branch: text(session.git.initial.branch), commit: text(session.git.initial.commit_hash) } : null,
        observations: (session.git?.observations || []).map((item) => ({ id: text(item.id), timestamp: item.timestamp || null, operation: text(item.operation), command: text(item.command), branch: text(item.branch), commit: text(item.commit), subject: text(item.subject), success: typeof item.success === 'boolean' ? item.success : null })) },
      events, failures, changes, validations, sources: raw.map((item) => sourceFor(item, sessionStart)).sort((a, b) => time(a.timestamp) - time(b.timestamp) || a.evidenceId.localeCompare(b.evidenceId)) };
  });
  const byId = new Map(workstreams.map((item) => [item.id, item])); for (const item of workstreams) if (item.parentId && byId.has(item.parentId)) byId.get(item.parentId)?.childIds.push(item.id);
  for (const item of workstreams) item.childIds.sort((left, right) => {
    const leftEdge = parents.get(left); const rightEdge = parents.get(right);
    return time(leftEdge?.timestamp || byId.get(left)?.start || null) - time(rightEdge?.timestamp || byId.get(right)?.start || null) || left.localeCompare(right);
  });
  for (const edge of pack.edges) { const parent = byId.get(edge.parent); const child = byId.get(edge.child); if (!parent || !child) continue;
    const evidence = pack.evidence.find((item) => item.kind === 'delegation_edge' && item.data.parent === edge.parent && item.data.child === edge.child); const source = evidence ? sourceFor(evidence, parent.start) : child.sources[0] ? { ...child.sources[0], sessionStart: parent.start } : undefined; if (!source) continue;
    const event: DelegationEvent = { id: evidence?.id || `delegation:${edge.parent}:${edge.child}`, kind: 'delegation', timestamp: edge.timestamp || null, title: `Delegated ${child.label}`, summary: child.task.objective,
      source, sources: [source], childId: child.id, endTimestamp: child.end }; parent.events.push(event); parent.events.sort(compareEvents); }
  const sessionStarts = new Map(sessions.map((session) => [session.id, session.window?.start || null]));
  const evidenceOwners = new Map(pack.evidence.map((item) => [item.id, visible.has(item.sessionId) ? item.sessionId : rootId])); const sourceByEvidence = new Map(pack.evidence.map((item) => [item.id, sourceFor(item, sessionStarts.get(item.sessionId) || null)]));
  const report = { rootId, analysis, evidence: pack, workstreams, byId, evidenceOwners, sourceByEvidence, threadRelations: pack.threadRelations,
    modelStatistics: aggregateModels(workstreams),
    resourceStatistics: { duration: statistic(workstreams.map((item) => item.resources.durationSeconds)), toolCalls: statistic(workstreams.map((item) => item.resources.toolCalls)), tokens: statistic(workstreams.map((item) => item.resources.tokens.total)) } } satisfies ReportViewModel;
  return report;
}

export const shortId = (id: string): string => id.slice(-8);
