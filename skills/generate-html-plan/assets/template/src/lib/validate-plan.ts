import type { HtmlPlan } from "./plan-model";

const present = (value: string) => value.trim().length > 0;

export function validatePlan(plan: HtmlPlan): string[] {
  const errors: string[] = [];
  const requireText = (label: string, value: string) => {
    if (!present(value)) errors.push(`${label} must not be empty.`);
  };
  requireText("title", plan.title);
  requireText("subtitle", plan.subtitle);
  requireText("repository", plan.repository);
  requireText("objective", plan.objective);
  requireText("outcome", plan.outcome);

  for (const [label, values] of [
    ["scope", plan.scope],
    ["nonGoals", plan.nonGoals],
    ["constraints", plan.constraints],
    ["successSignals", plan.successSignals],
  ] as const) {
    if (!values.length) errors.push(`${label} must contain at least one item.`);
    if (values.some((value) => !present(value))) {
      errors.push(`${label} contains an empty item.`);
    }
  }

  const uniqueIds = <T extends { id: string }>(label: string, items: T[]) => {
    const ids = new Set<string>();
    for (const item of items) {
      requireText(`${label} id`, item.id);
      if (ids.has(item.id)) errors.push(`Duplicate ${label} id: ${item.id}.`);
      ids.add(item.id);
    }
    return ids;
  };

  const decisionIds = uniqueIds("decision", plan.decisions);
  if (!decisionIds.size) errors.push("decisions must contain at least one item.");
  for (const decision of plan.decisions) {
    requireText(`decision ${decision.id} title`, decision.title);
    requireText(`decision ${decision.id} question`, decision.question);
    requireText(`decision ${decision.id} choice`, decision.choice);
    requireText(`decision ${decision.id} rationale`, decision.rationale);
    if (!decision.alternatives.length) {
      errors.push(`decision ${decision.id} must record at least one alternative.`);
    }
    for (const source of decision.sources ?? []) {
      requireText(`decision ${decision.id} source label`, source.label);
      requireText(`decision ${decision.id} source path`, source.path);
    }
  }

  const nodeIds = uniqueIds("architecture node", plan.architecture.nodes);
  requireText("architecture summary", plan.architecture.summary);
  if (!nodeIds.size) errors.push("architecture must contain at least one node.");
  for (const edge of plan.architecture.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) {
      errors.push(
        `Architecture edge ${edge.from} -> ${edge.to} references a missing node.`,
      );
    }
  }

  const phaseIds = uniqueIds("phase", plan.phases);
  if (!phaseIds.size) errors.push("phases must contain at least one item.");
  const riskIds = uniqueIds("risk", plan.risks);
  if (!riskIds.size) errors.push("risks must contain at least one item.");
  const scenarioIds = uniqueIds("scenario", plan.scenarios);
  if (!scenarioIds.size) errors.push("scenarios must contain at least one item.");
  for (const phase of plan.phases) {
    requireText(`phase ${phase.id} outcome`, phase.outcome);
    if (!phase.changes.length) {
      errors.push(`phase ${phase.id} must contain at least one concrete change.`);
    }
    if (!phase.verification.length) {
      errors.push(`phase ${phase.id} must contain verification.`);
    }
    if (!phase.completeWhen.length) {
      errors.push(`phase ${phase.id} must define completion signals.`);
    }
    for (const dependency of phase.dependsOn) {
      if (!phaseIds.has(dependency)) {
        errors.push(`phase ${phase.id} depends on missing phase ${dependency}.`);
      }
      if (dependency === phase.id) {
        errors.push(`phase ${phase.id} cannot depend on itself.`);
      }
    }
    for (const risk of phase.riskIds ?? []) {
      if (!riskIds.has(risk)) {
        errors.push(`phase ${phase.id} references missing risk ${risk}.`);
      }
    }
  }

  const visitState = new Map<string, "visiting" | "visited">();
  const byId = new Map(plan.phases.map((phase) => [phase.id, phase]));
  const visit = (id: string) => {
    if (visitState.get(id) === "visiting") {
      errors.push(`Phase dependency cycle includes ${id}.`);
      return;
    }
    if (visitState.get(id) === "visited") return;
    visitState.set(id, "visiting");
    for (const dependency of byId.get(id)?.dependsOn ?? []) visit(dependency);
    visitState.set(id, "visited");
  };
  for (const id of phaseIds) visit(id);

  for (const scenario of plan.scenarios) {
    requireText(`scenario ${scenario.id} given`, scenario.given);
    requireText(`scenario ${scenario.id} when`, scenario.when);
    requireText(`scenario ${scenario.id} then`, scenario.then);
  }
  for (const risk of plan.risks) {
    requireText(`risk ${risk.id} mitigation`, risk.mitigation);
    requireText(`risk ${risk.id} trigger`, risk.trigger);
  }
  for (const item of plan.deferred) {
    requireText("deferred item title", item.title);
    requireText(`deferred ${item.title} reason`, item.reason);
    requireText(`deferred ${item.title} owner`, item.owner);
    requireText(`deferred ${item.title} resolveWhen`, item.resolveWhen);
  }

  return [...new Set(errors)];
}
