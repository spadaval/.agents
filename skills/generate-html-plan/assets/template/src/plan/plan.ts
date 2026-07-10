import { definePlan, type HtmlPlan } from "../lib/plan-model";

// Replace this starter content with the resolved decision ledger. Keep the
// structure: the shared viewer and validator intentionally depend on it.
export const plan: HtmlPlan = definePlan({
  title: "Interactive implementation plan",
  subtitle: "A resolved design, organized for implementation and review",
  status: "draft",
  repository: "/path/to/repository",
  objective: "Describe the user or system problem this work will solve.",
  outcome: "Describe the observable end state once the plan is implemented.",
  scope: ["One concrete capability included in this plan"],
  nonGoals: ["One nearby capability intentionally excluded"],
  constraints: ["One technical, product, or delivery constraint"],
  successSignals: ["One behavior or measurement that proves success"],
  assumptions: ["One low-impact, reversible assumption made explicit"],
  decisions: [
    {
      id: "decision-boundary",
      title: "Choose the primary change boundary",
      question: "Where should the new responsibility live?",
      choice: "Place it in the component that already owns the relevant state.",
      rationale:
        "Keeping state and policy together avoids a second source of truth and follows the existing ownership boundary.",
      impact: "L",
      confidence: "medium",
      alternatives: [
        {
          label: "Create a new service",
          tradeoff: "Clear isolation, with additional integration and operations cost.",
          rejectedBecause: "The current scope does not justify a new runtime boundary.",
        },
      ],
      sources: [
        {
          label: "Existing owner",
          path: "src/example.ts",
          detail: "Replace with the path that establishes the current boundary.",
        },
      ],
    },
  ],
  architecture: {
    summary: "Show how the changed responsibility connects to the current system.",
    nodes: [
      {
        id: "caller",
        title: "Caller",
        description: "Initiates the behavior.",
        kind: "existing",
      },
      {
        id: "owner",
        title: "Capability owner",
        description: "Owns the new policy and state transition.",
        kind: "change",
      },
    ],
    edges: [{ from: "caller", to: "owner", label: "requests change" }],
  },
  phases: [
    {
      id: "phase-foundation",
      title: "Establish the behavior boundary",
      outcome: "The owning component exposes the agreed capability.",
      description: "Implement the smallest end-to-end slice at the chosen boundary.",
      dependsOn: [],
      changes: [
        {
          title: "Add the capability contract",
          detail: "Define inputs, output, invariants, and failure behavior.",
          paths: ["src/example.ts", "tests/example.test.ts"],
        },
      ],
      verification: ["Run the focused unit and integration tests."],
      completeWhen: ["The primary scenario passes through the real boundary."],
      riskIds: ["risk-contract"],
    },
  ],
  scenarios: [
    {
      id: "scenario-primary",
      title: "Primary behavior",
      kind: "primary",
      given: "A valid caller and an eligible resource",
      when: "The caller requests the new capability",
      then: "The owner applies the transition once and returns the agreed result",
    },
  ],
  risks: [
    {
      id: "risk-contract",
      title: "The new contract diverges from existing callers",
      likelihood: "medium",
      impact: "L",
      description: "Existing assumptions may not be represented in the first contract.",
      mitigation: "Exercise current caller fixtures against the new boundary.",
      trigger: "A caller requires an input or side effect absent from the contract.",
    },
  ],
  documentation: [
    {
      path: "CONTEXT.md",
      action: "propose",
      kind: "context",
      summary: "Record any resolved domain term introduced by the capability.",
    },
  ],
  deferred: [
    {
      title: "Broader optimization",
      reason: "It is not required to prove the initial capability.",
      owner: "Implementation owner",
      resolveWhen: "Measured behavior shows the first slice misses its success signal.",
    },
  ],
});
