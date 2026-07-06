import type { Component } from 'svelte';

export type RawEvidence = {
  id: string; kind: string; sessionId: string; timestamp: string | null;
  source: Record<string, unknown>; excerpt: string; data: Record<string, unknown>;
};

export type TokenUsage = {
  total: number | null; input: number | null; cachedInput: number | null;
  uncachedInput: number | null; output: number | null; reasoning: number | null;
};

export type ModelConfiguration = {
  model: string; effort: string | null; startedAt: string | null;
  source?: { path?: string; line?: number | string };
};
export type ModelTokenUsage = TokenUsage & { model: string; snapshotCount: number };
export type SessionModelUsage = {
  provider: string | null; configurations: ModelConfiguration[]; tokensByModel: ModelTokenUsage[];
};

export type RawSession = {
  id: string;
  rolloutCount?: number;
  window?: { start?: string | null; end?: string | null; durationSeconds?: number | null };
  metrics?: Record<string, number | null>;
  tokens?: Partial<TokenUsage> & Record<string, number | null | undefined>;
  tokenUsage?: Record<string, number | null | undefined>;
  modelUsage?: Partial<SessionModelUsage>;
  sourceRollouts?: string[]; cwd?: string; parentId?: string | null; parentIds?: string[];
  childIds?: string[]; delegatedAt?: string | null; assignment?: string; finalHandoff?: string;
  label?: string; role?: string; status?: string;
  git?: { initial?: { repository_url?: string; branch?: string; commit_hash?: string } | null; observations?: Array<{ id?: string; timestamp?: string | null; operation?: string; command?: string; branch?: string; commit?: string; subject?: string; success?: boolean }> };
};

export type DelegationEdge = {
  parent: string; child: string; kind: string; timestamp?: string | null;
  source?: Record<string, unknown>; assignment?: string; role?: string;
};

export type ThreadRelation = {
  from: string; to: string; kind: string; timestamp?: string | null;
  source?: Record<string, unknown>; prompt?: string;
};

export type EvidencePack = {
  schemaVersion: number; discoverySessionId: string; primaryThreadId?: string; generatedAt: string;
  report: { totals: Record<string, number>; linkedSessionEvidence: unknown[] };
  sessions: RawSession[]; threadRelations: ThreadRelation[]; edges: DelegationEdge[]; evidence: RawEvidence[];
};

export type Citation = { evidenceId: string; note?: string };
export type Confidence = 'high' | 'medium' | 'low';
export type Lifecycle = 'completed' | 'active' | 'aborted' | 'unknown';
export type Outcome = 'succeeded' | 'partial' | 'failed' | 'blocked' | 'unknown';

export type Assessment = {
  lifecycle: Lifecycle; outcome: Outcome; confidence: Confidence;
  summary: string; citations: Citation[];
};

export type AnalyzedTask = {
  title: string; objective: string; successCriteria: string[]; issueReferences: string[]; citations: Citation[];
};

export type Action = {
  id: string; title: string; summary: string; result: string; significance?: string;
  start: string; end: string; sessionIds?: string[]; citations: Citation[];
};

export type Phase = {
  id: string; title: string; summary: string; start: string | null; end: string | null;
  citations?: Citation[];
};

export type WorkstreamAnalysis = {
  sessionId: string; label: string; role: string; task: AnalyzedTask;
  assessment: Assessment; summary: string; actions: Action[]; phases: Phase[];
};

export type FailureTheme = {
  id: string; title: string; summary: string; affectedSessionIds: string[]; citations: Citation[];
};

export type GitObservation = {
  id: string; title: string; summary: string; sessionIds: string[]; citations: Citation[];
};
export type OutcomeMatrixRow = {
  id: string; objective: string; sessionIds: string[]; result: string; remainingRisk: string; citations: Citation[];
};

export type CrossThreadAnalysis = {
  summary: string; outcomeSynthesis: string; outcomeMatrix: OutcomeMatrixRow[]; failureThemes: FailureTheme[];
  delegationEffectiveness: string; delegationCitations: Citation[];
  resourceInterpretation: string; resourceCitations: Citation[];
  gitSummary: string; gitObservations: GitObservation[];
};

export type CustomSectionPlacement =
  | 'root-after-summary' | 'root-after-phases' | 'root-after-cross-thread'
  | 'workstream-after-summary' | 'workstream-after-phases' | 'cross-thread-after-core';

export type CustomSectionContext = {
  report: ReportViewModel; evidence: EvidencePack; workstream?: Workstream;
};

export type CustomSection = {
  id: string; placement: CustomSectionPlacement; sessionId?: string;
  component: Component<CustomSectionContext>;
};

export type RunAnalysis = {
  version: 1; primarySessionId: string; task: AnalyzedTask; assessment: Assessment;
  summary: string; workstreams: WorkstreamAnalysis[]; crossThread: CrossThreadAnalysis;
  customSections?: CustomSection[];
};

export type SourceReference = {
  evidenceId: string; sessionId: string; timestamp: string | null; path?: string; paths?: string[];
  line?: number | string; sessionStart?: string | null; raw: RawEvidence;
};

export type WorkstreamEvent = {
  id: string; kind: 'message' | 'user_message' | 'failure' | 'change' | 'validation' | 'delegation' | 'tool';
  timestamp: string | null; title: string; summary: string; source: SourceReference; sources: SourceReference[];
};
export type FailureEvent = WorkstreamEvent & { kind: 'failure'; command: string; error: string; response: string; followUpAction: string; outcome: string };
export type ChangeEvent = WorkstreamEvent & { kind: 'change'; paths: string[]; success: boolean | null; patchCount: number };
export type ValidationEvent = WorkstreamEvent & { kind: 'validation'; commands: string[]; outputs: string[] };
export type DelegationEvent = WorkstreamEvent & { kind: 'delegation'; childId: string; endTimestamp: string | null };

export type SessionResources = { durationSeconds: number | null; toolCalls: number | null; tokens: TokenUsage };
export type SessionGit = { initial: { repositoryUrl: string; branch: string; commit: string } | null; observations: Array<{ id: string; timestamp: string | null; operation: string; command: string; branch: string; commit: string; subject: string; success: boolean | null }> };

export type Workstream = {
  id: string; shortId: string; label: string; role: string; lifecycle: Lifecycle; outcome: Outcome;
  assessment: Assessment; task: AnalyzedTask; analysisSummary: string; actions: Action[]; phases: Phase[];
  parentId: string | null; parentEdge: DelegationEdge | null; childIds: string[]; crossLinkParentIds: string[];
  isThreadRoot: boolean; isPrimaryThread: boolean;
  start: string | null; end: string | null; resources: SessionResources;
  modelUsage: SessionModelUsage;
  git: SessionGit;
  events: WorkstreamEvent[]; failures: FailureEvent[]; changes: ChangeEvent[]; validations: ValidationEvent[];
  sources: SourceReference[];
};

export type ResourceStatistic = { count: number; missing: number; total: number; mean: number; median: number; min: number; max: number };
export type ResourceStatistics = { duration: ResourceStatistic; toolCalls: ResourceStatistic; tokens: ResourceStatistic };
export type ModelStatistic = TokenUsage & {
  model: string; sessionIds: string[]; efforts: string[]; providers: string[]; snapshotCount: number;
};

export type ReportViewModel = {
  rootId: string; analysis: RunAnalysis; evidence: EvidencePack; workstreams: Workstream[]; byId: Map<string, Workstream>;
  threadRelations: ThreadRelation[];
  evidenceOwners: Map<string, string>; sourceByEvidence: Map<string, SourceReference>;
  resourceStatistics: ResourceStatistics;
  modelStatistics: ModelStatistic[];
};
