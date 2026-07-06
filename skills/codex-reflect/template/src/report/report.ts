import type { RunAnalysis } from '../platform/types';

/**
 * This neutral placeholder keeps a freshly generated viewer compile-safe.
 * The reflect analysis step replaces it with the evidence-backed, run-specific report.
 */
export const runAnalysis = {
  version: 1,
  primarySessionId: '',
  task: { title: 'Analysis not authored', objective: '', successCriteria: [], issueReferences: [], citations: [] },
  assessment: { lifecycle: 'unknown', outcome: 'unknown', confidence: 'low', summary: 'Analysis has not been authored for this run.', citations: [] },
  summary: 'Run analysis is pending.',
  workstreams: [],
  crossThread: {
    summary: '', outcomeSynthesis: '', outcomeMatrix: [], failureThemes: [], delegationEffectiveness: '', delegationCitations: [],
    resourceInterpretation: '', resourceCitations: [], gitSummary: '', gitObservations: []
  }
} satisfies RunAnalysis;
