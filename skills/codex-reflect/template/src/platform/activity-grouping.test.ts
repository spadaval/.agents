import { describe, expect, it } from 'vitest';
import { activityCounts, activityRecords, categoryFor, groupActivity, relativeTime } from './activity-grouping';
import type { RawEvidence, SourceReference } from './types';

function source(id: string, kind: string, seconds: number, data: Record<string, unknown> = {}): SourceReference {
  const timestamp = `2026-07-01T10:00:${String(seconds).padStart(2, '0')}Z`;
  const raw: RawEvidence = { id, kind, sessionId: 'session', timestamp, source: {}, excerpt: id, data };
  return { evidenceId: id, sessionId: 'session', timestamp, sessionStart: '2026-07-01T10:00:00Z', raw };
}

describe('activity grouping', () => {
  it('groups only consecutive compatible records and keeps messages and failures standalone', () => {
    const sources = [
      source('tool-1', 'tool_interaction', 1),
      source('validation-1', 'validation', 1, { toolInteractionEvidenceId: 'tool-1' }),
      source('tool-2', 'tool_interaction', 2),
      source('user-1', 'user_message', 3),
      source('tool-3', 'tool_interaction', 4),
      source('patch-1', 'patch', 4, { toolInteractionEvidenceId: 'tool-3', changes: ['src/a.ts'] }),
      source('tool-4', 'tool_interaction', 5),
      source('patch-2', 'patch', 5, { toolInteractionEvidenceId: 'tool-4', changes: ['src/b.ts'] }),
      source('tool-5', 'tool_interaction', 6),
      source('failure-1', 'failure', 6, { toolInteractionEvidenceId: 'tool-5' }),
    ];
    const records = activityRecords(sources); const groups = groupActivity(records);
    expect(groups.map((item) => [item.category, item.items.length])).toEqual([
      ['command', 2], ['user', 1], ['file', 2], ['failure', 1],
    ]);
    expect(activityCounts(sources, records)).toEqual({ events: 10, commands: 2, files: 2, failures: 1, git: 0, messages: 1 });
  });

  it('elevates only successful captured commits to Git activity', () => {
    const parent = source('tool', 'tool_interaction', 1);
    const branchSwitch = source('switch', 'git_observation', 1, { operation: 'branch_switch', success: true, commit: 'abc' });
    const failedCommit = source('failed', 'git_observation', 1, { operation: 'commit', success: false, commit: 'abc' });
    const commit = source('commit', 'git_observation', 1, { operation: 'commit', success: true, commit: 'abc123', subject: 'Ship it' });
    expect(categoryFor(parent, [branchSwitch])).toBe('command');
    expect(categoryFor(parent, [failedCommit])).toBe('command');
    expect(categoryFor(parent, [commit])).toBe('git');
  });

  it('formats timestamps from session start', () => {
    expect(relativeTime('2026-07-01T10:01:07Z', '2026-07-01T10:00:00Z')).toBe('+1m 7s');
    expect(relativeTime('2026-07-01T12:03:00Z', '2026-07-01T10:00:00Z')).toBe('+2h 3m');
    expect(relativeTime(null, '2026-07-01T10:00:00Z')).toBe('Time not recorded');
  });
});
