export type Evidence = {
  id: string;
  kind: string;
  sessionId: string;
  timestamp: string | null;
  source: Record<string, unknown>;
  excerpt: string;
  data: Record<string, unknown>;
};

export type EvidencePack = {
  schemaVersion: number;
  rootSessionId: string;
  generatedAt: string;
  report: { totals: Record<string, number>; linkedSessionEvidence: unknown[] };
  sessions: Array<Record<string, unknown>>;
  edges: Array<Record<string, string>>;
  evidence: Evidence[];
};
