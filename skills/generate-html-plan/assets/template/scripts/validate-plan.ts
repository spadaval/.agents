import { plan } from "../src/plan/plan";
import { validatePlan } from "../src/lib/validate-plan";

const errors = validatePlan(plan);
if (errors.length) {
  throw new Error(`Plan validation failed:\n\n${errors.map((error) => `- ${error}`).join("\n")}`);
} else {
  console.log(
    `Plan validated: ${plan.decisions.length} decisions, ${plan.phases.length} phases, ${plan.risks.length} risks.`,
  );
}
