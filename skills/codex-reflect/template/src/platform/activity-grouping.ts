import type { SourceReference } from './types';

export type ActivityCategory = 'command' | 'file' | 'git' | 'failure' | 'user' | 'agent' | 'delegation' | 'context' | 'other';
export type ActivityRecord = { source: SourceReference; derived: SourceReference[]; category: ActivityCategory };
export type ActivityGroup = { id: string; category: ActivityCategory; items: ActivityRecord[] };
export type ActivityCounts = { events: number; commands: number; files: number; failures: number; git: number; messages: number };

const groupable = new Set<ActivityCategory>(['command', 'file', 'git']);

export function categoryFor(source: SourceReference, derived: SourceReference[] = []): ActivityCategory {
  const kinds = new Set([source.raw.kind, ...derived.map((item) => item.raw.kind)]);
  const commit = derived.find((item) => item.raw.kind === 'git_observation'
    && item.raw.data.operation === 'commit' && item.raw.data.success === true
    && typeof item.raw.data.commit === 'string' && item.raw.data.commit.length > 0);
  if (kinds.has('failure')) return 'failure';
  if (kinds.has('patch')) return 'file';
  if (commit) return 'git';
  if (kinds.has('validation') || kinds.has('tool_interaction') || kinds.has('tool_call') || kinds.has('interaction')) return 'command';
  if (kinds.has('user_message')) return 'user';
  if (kinds.has('agent_message') || kinds.has('turn')) return 'agent';
  if (kinds.has('delegation_edge') || kinds.has('thread_relation')) return 'delegation';
  if (kinds.has('session_summary') || kinds.has('model_configuration') || kinds.has('token_snapshot') || kinds.has('long_gap') || kinds.has('git_initial_state')) return 'context';
  return 'other';
}

export function activityRecords(sources: SourceReference[]): ActivityRecord[] {
  const ids = new Set(sources.map((source) => source.evidenceId));
  const children = new Map<string, SourceReference[]>();
  for (const source of sources) {
    const owner = typeof source.raw.data.toolInteractionEvidenceId === 'string' ? source.raw.data.toolInteractionEvidenceId : '';
    if (!owner || !ids.has(owner)) continue;
    const list = children.get(owner) || [];
    list.push(source);
    children.set(owner, list);
  }
  return sources.filter((source) => {
    const owner = typeof source.raw.data.toolInteractionEvidenceId === 'string' ? source.raw.data.toolInteractionEvidenceId : '';
    return !owner || !ids.has(owner);
  }).map((source) => {
    const derived = children.get(source.evidenceId) || [];
    return { source, derived, category: categoryFor(source, derived) };
  });
}

export function groupActivity(records: ActivityRecord[]): ActivityGroup[] {
  const groups: ActivityGroup[] = [];
  for (const record of records) {
    const previous = groups.at(-1);
    if (previous && groupable.has(record.category) && previous.category === record.category) previous.items.push(record);
    else groups.push({ id: record.source.evidenceId, category: record.category, items: [record] });
  }
  return groups;
}

export function activityCounts(sources: SourceReference[], records = activityRecords(sources)): ActivityCounts {
  const files = new Set<string>();
  for (const source of sources) {
    const changes = Array.isArray(source.raw.data.changes) ? source.raw.data.changes : [];
    for (const path of changes) files.add(String(path));
  }
  return {
    events: sources.length,
    commands: records.filter((item) => item.category === 'command').length,
    files: files.size,
    failures: records.filter((item) => item.category === 'failure').length,
    git: records.filter((item) => item.category === 'git').length,
    messages: records.filter((item) => item.category === 'user' || item.category === 'agent').length,
  };
}

export function relativeTime(timestamp: string | null, sessionStart: string | null | undefined): string {
  if (!timestamp || !sessionStart) return 'Time not recorded';
  const elapsed = Date.parse(timestamp) - Date.parse(sessionStart);
  if (!Number.isFinite(elapsed)) return 'Time not recorded';
  const seconds = Math.max(0, Math.round(elapsed / 1000));
  if (seconds < 60) return `+${seconds}s`;
  const minutes = Math.floor(seconds / 60); const remainder = seconds % 60;
  if (minutes < 60) return `+${minutes}m${remainder ? ` ${remainder}s` : ''}`;
  const hours = Math.floor(minutes / 60); const minuteRemainder = minutes % 60;
  return `+${hours}h${minuteRemainder ? ` ${minuteRemainder}m` : ''}`;
}

export function groupLabel(group: ActivityGroup): string {
  const nouns: Record<ActivityCategory, [string, string]> = {
    command: ['command', 'commands'], file: ['file edit', 'file edits'], git: ['Git operation', 'Git operations'],
    failure: ['failure', 'failures'], user: ['user message', 'user messages'], agent: ['agent message', 'agent messages'],
    delegation: ['delegation', 'delegations'], context: ['context event', 'context events'], other: ['event', 'events'],
  };
  const noun = nouns[group.category][group.items.length === 1 ? 0 : 1];
  return `${group.items.length} ${noun}`;
}
