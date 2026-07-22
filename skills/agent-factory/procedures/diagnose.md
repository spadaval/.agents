# Diagnose

Use this subskill to establish the cause of a bug, failed check, performance
regression, integration failure, or unexpected behavior before proposing a fix.
Diagnosis is read-only except for explicitly authorized instrumentation,
reproduction fixtures, or disposable experiments.

## Method

1. State the observed behavior, expected behavior, scope, and impact.
2. Reproduce it consistently or report what evidence is still missing.
3. Read the complete error, trace, logs, and relevant recent changes.
4. Trace the failing value or state backward across component boundaries.
5. Form competing hypotheses and test the cheapest discriminating one first.
6. Identify the root cause and the smallest regression proof that would fail
   before a repair and pass after it.

Instrument boundaries when a multi-component system hides where state changes.
Record inputs and outputs at each boundary instead of guessing from the final
symptom. Change one experimental variable at a time. After three unsuccessful
root-cause hypotheses, stop and question the framing, architecture, or
reproduction before proposing another patch.

## Authority

Do not implement the repair. Preserve the failing reproduction and route the
established cause, repair boundary, and regression proof into a separate
`implement` assignment. If the original request asked for both diagnosis and
repair, the orchestrator may continue immediately after this handoff without
asking for routine permission, but the Worker roles remain separate.

## Handoff

Report the reproduction, observations, hypotheses tested, root cause, confidence,
recommended repair boundary, proposed regression proof, artifacts or commands,
and unresolved uncertainty. Distinguish established facts from inference.
