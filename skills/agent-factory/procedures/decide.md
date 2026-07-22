# Decide

Use this subskill for a consequential product, architecture, or strategy choice
with multiple plausible paths. Do not use the full workflow for routine,
reversible implementation decisions.

## Method

Prefer evidence over confidence, expose bad framing, and preserve material
dissent. Use separate roles when independence improves the result:

1. Frame the choice, stakes, constraints, unknowns, and reversibility.
2. Research code, docs, ADRs, external sources, and user constraints.
3. Propose credible options with assumptions, benefits, costs, and risks.
4. Assign isolated Advocates and Critics for serious options.
5. Assign an independent Judge to recommend a choice and retain uncertainty.

Do not let one subagent both advocate and judge an option. If subagents are
unavailable, use visibly separated passes and disclose the loss of independent
review.

Scale the roles to the decision. Skip roles that add ceremony without changing
confidence. Use the delegation template in [Orchestrate](orchestrate.md) and
load [Submodel Selection](../references/submodel-selection.md) before spawning.

## Authority

Inside a commissioned strategy session (defined in the
[Constitution](../constitution.md)), the primary agent may make the decision
and hand it to `plan` for publication. Outside one, return a non-canonical
proposal and stop before changing strategy or dependent work.

Record mission-local decisions in the strategic plan. Record decisions that
outlive the mission in the owning product or architecture document and, when
the rationale matters, an ADR. Leave reversible implementation choices to the
tracker or Worker.

## Output

Report the framing, options, evidence, strongest arguments, recommendation,
dissent, decision authority, and correct durable destination. Do not implement
the choice.
