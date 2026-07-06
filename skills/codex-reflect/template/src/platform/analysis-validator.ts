import type { EvidencePack, RunAnalysis } from './types';

export function validateAnalysis(analysis: RunAnalysis, pack: EvidencePack): string[] {
  const errors: string[] = []; const sessions = new Set(pack.sessions.map((item) => item.id)); const evidence = new Set(pack.evidence.map((item) => item.id));
  if (!sessions.has(analysis.primarySessionId)) errors.push(`Primary session does not exist: ${analysis.primarySessionId || '(empty)'}`);
  const entries = new Map<string, number>(); const ids = new Set<string>();
  const checkCitations = (citations: Array<{ evidenceId: string }>, owner: string) => citations.forEach((citation) => { if (!evidence.has(citation.evidenceId)) errors.push(`${owner} cites missing evidence: ${citation.evidenceId}`); });
  checkCitations(analysis.task.citations, 'Run task'); checkCitations(analysis.assessment.citations, 'Run assessment');
  for (const workstream of analysis.workstreams) {
    entries.set(workstream.sessionId, (entries.get(workstream.sessionId) || 0) + 1);
    if (!sessions.has(workstream.sessionId)) errors.push(`Analysis references missing session: ${workstream.sessionId}`);
    checkCitations(workstream.task.citations, `${workstream.label} task`); checkCitations(workstream.assessment.citations, `${workstream.label} assessment`);
    let previous = Number.NEGATIVE_INFINITY;
    for (const phase of workstream.phases) {
      if (ids.has(phase.id)) errors.push(`Duplicate phase/action ID: ${phase.id}`); ids.add(phase.id);
      const start = phase.start ? Date.parse(phase.start) : previous;
      if (Number.isFinite(start) && start < previous) errors.push(`Phases are not chronological for ${workstream.sessionId}`);
      if (Number.isFinite(start)) previous = start;
      if (phase.start && phase.end && Date.parse(phase.end) < Date.parse(phase.start)) errors.push(`Phase ends before it starts: ${phase.id}`);
      checkCitations(phase.citations || [], `Phase ${phase.id}`);
    }
    let previousAction = Number.NEGATIVE_INFINITY; let previousEnd = Number.NEGATIVE_INFINITY;
    for (const action of workstream.actions) { if (ids.has(action.id)) errors.push(`Duplicate phase/action ID: ${action.id}`); ids.add(action.id); checkCitations(action.citations, `Action ${action.id}`); const start = Date.parse(action.start); const end = Date.parse(action.end); if (Number.isNaN(start) || Number.isNaN(end)) errors.push(`Action requires valid start and end times: ${action.id}`); if (Number.isFinite(start) && start < previousAction) errors.push(`Actions are not chronological for ${workstream.sessionId}`); if (Number.isFinite(start) && Number.isFinite(end) && end < start) errors.push(`Action ends before it starts: ${action.id}`); if (Number.isFinite(start) && start <= previousEnd) errors.push(`Action ranges overlap for ${workstream.sessionId}: ${action.id}`); if (Number.isFinite(start)) previousAction = start; if (Number.isFinite(end)) previousEnd = end; for (const id of action.sessionIds || []) if (!sessions.has(id)) errors.push(`Action ${action.id} references missing session: ${id}`); }
  }
  for (const session of sessions) if ((entries.get(session) || 0) !== 1) errors.push(`Session requires exactly one workstream analysis: ${session}`);
  for (const theme of analysis.crossThread.failureThemes) { if (ids.has(theme.id)) errors.push(`Duplicate phase/action ID: ${theme.id}`); ids.add(theme.id); checkCitations(theme.citations, `Failure theme ${theme.id}`); for (const id of theme.affectedSessionIds) if (!sessions.has(id)) errors.push(`Failure theme ${theme.id} references missing session: ${id}`); }
  for (const row of analysis.crossThread.outcomeMatrix) { if (ids.has(row.id)) errors.push(`Duplicate phase/action ID: ${row.id}`); ids.add(row.id); checkCitations(row.citations, `Outcome row ${row.id}`); for (const id of row.sessionIds) if (!sessions.has(id)) errors.push(`Outcome row ${row.id} references missing session: ${id}`); }
  checkCitations(analysis.crossThread.delegationCitations, 'Delegation analysis'); checkCitations(analysis.crossThread.resourceCitations, 'Resource analysis');
  for (const item of analysis.crossThread.gitObservations) { if (ids.has(item.id)) errors.push(`Duplicate phase/action ID: ${item.id}`); ids.add(item.id); checkCitations(item.citations, `Git observation ${item.id}`); }
  const slots = new Set<string>(); for (const slot of analysis.customSections || []) { if (slots.has(slot.id)) errors.push(`Duplicate custom section ID: ${slot.id}`); slots.add(slot.id); if (slot.sessionId && !sessions.has(slot.sessionId)) errors.push(`Custom section ${slot.id} references missing session: ${slot.sessionId}`); }
  return errors;
}
