import { describe, expect, it } from 'vitest';
import { validateAnalysis } from './analysis-validator';
import { fixtureAnalysis, fixturePack } from './test-fixture';

describe('analysis validation', () => {
  it('accepts complete, cited analysis', () => expect(validateAnalysis(fixtureAnalysis, fixturePack)).toEqual([]));
  it('rejects missing coverage and bad citations', () => {
    const invalid = { ...fixtureAnalysis, workstreams: fixtureAnalysis.workstreams.slice(0, 1), task: { ...fixtureAnalysis.task, citations: [{ evidenceId: 'missing' }] } };
    const errors = validateAnalysis(invalid, fixturePack); expect(errors.some((error) => error.includes('missing evidence'))).toBe(true); expect(errors.filter((error) => error.includes('exactly one')).length).toBe(2);
  });
  it('rejects reversed action spans and missing participating sessions', () => {
    const action = { ...fixtureAnalysis.workstreams[0].actions[0], end: '2026-06-30T09:00:00Z', sessionIds: ['missing-session'] };
    const invalid = { ...fixtureAnalysis, workstreams: [{ ...fixtureAnalysis.workstreams[0], actions: [action, ...fixtureAnalysis.workstreams[0].actions.slice(1)] }, ...fixtureAnalysis.workstreams.slice(1)] };
    const errors = validateAnalysis(invalid, fixturePack); expect(errors).toContain(`Action ends before it starts: ${action.id}`); expect(errors).toContain(`Action ${action.id} references missing session: missing-session`);
  });
  it('rejects overlapping action ownership ranges', () => {
    const actions = fixtureAnalysis.workstreams[0].actions.map((action, index) => index === 1 ? { ...action, start: '2026-06-30T10:06:00Z' } : action); const invalid = { ...fixtureAnalysis, workstreams: [{ ...fixtureAnalysis.workstreams[0], actions }, ...fixtureAnalysis.workstreams.slice(1)] };
    expect(validateAnalysis(invalid, fixturePack)).toContain(`Action ranges overlap for ${fixturePack.primaryThreadId}: action-validation`);
  });
});
