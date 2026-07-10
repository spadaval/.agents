export type Impact = "S" | "M" | "L" | "XL";
export type Confidence = "high" | "medium" | "low";

export type SourceRef = {
  label: string;
  path: string;
  detail?: string;
};

export type PlanDecision = {
  id: string;
  title: string;
  question: string;
  choice: string;
  rationale: string;
  impact: Impact;
  confidence: Confidence;
  alternatives: Array<{
    label: string;
    tradeoff: string;
    rejectedBecause: string;
  }>;
  sources?: SourceRef[];
};

export type ArchitectureNode = {
  id: string;
  title: string;
  description: string;
  kind: "existing" | "change" | "external";
};

export type ArchitectureEdge = {
  from: string;
  to: string;
  label?: string;
};

export type PlanPhase = {
  id: string;
  title: string;
  outcome: string;
  description: string;
  dependsOn: string[];
  changes: Array<{
    title: string;
    detail: string;
    paths?: string[];
  }>;
  verification: string[];
  completeWhen: string[];
  riskIds?: string[];
};

export type PlanRisk = {
  id: string;
  title: string;
  likelihood: "low" | "medium" | "high";
  impact: Exclude<Impact, "S">;
  description: string;
  mitigation: string;
  trigger: string;
};

export type PlanScenario = {
  id: string;
  title: string;
  kind: "primary" | "edge" | "failure";
  given: string;
  when: string;
  then: string;
};

export type DocumentationChange = {
  path: string;
  action: "create" | "update" | "propose";
  kind: "context" | "adr" | "runbook" | "other";
  summary: string;
};

export type DeferredItem = {
  title: string;
  reason: string;
  owner: string;
  resolveWhen: string;
};

export type HtmlPlan = {
  title: string;
  subtitle: string;
  status: "draft" | "ready";
  repository: string;
  objective: string;
  outcome: string;
  scope: string[];
  nonGoals: string[];
  constraints: string[];
  successSignals: string[];
  assumptions: string[];
  decisions: PlanDecision[];
  architecture: {
    summary: string;
    nodes: ArchitectureNode[];
    edges: ArchitectureEdge[];
  };
  phases: PlanPhase[];
  scenarios: PlanScenario[];
  risks: PlanRisk[];
  documentation: DocumentationChange[];
  deferred: DeferredItem[];
};

export const definePlan = <T extends HtmlPlan>(plan: T): T => plan;
