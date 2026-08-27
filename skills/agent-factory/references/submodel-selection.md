# Submodel Selection

Choose the least expensive model that makes the whole workflow likely to
succeed. Account for attempts, verification, elapsed time, and the consequence
of accepting a mistake—not just the quality of one run.

## Tiers

Map the runtime's available models to three tiers:

| Tier | Default use |
| --- | --- |
| Cheap | Drafts, experiments, reconnaissance, mechanical changes, and other cheaply verified outputs |
| Balanced | Integration-ready implementation, review, and synthesis |
| Strong | Consequential decisions, difficult synthesis or orchestration, and results that are costly to verify or reverse |

Set both model and reasoning effort explicitly. Use only combinations exposed
by the runtime; if none can be set, keep the work local unless a human directs
an exception.

## Routing

Use cheap models freely for disposable work. A cheap agent may explore an
important or difficult problem when its output is contained, may be discarded,
and will be checked before it carries authority. Prefer cheap attempts for
reconnaissance, hypotheses, spikes, draft implementations, mechanical edits,
test generation, and parallel experiments with a reliable verifier.

Use balanced models when an agent must produce an integration-ready change,
interpret meaningful requirements, review semantic correctness, or combine
evidence into a reliable recommendation.

Use strong models when capability materially protects the outcome: the result
carries consequential decision authority, reasoning is tightly coupled,
subtle mistakes lack a reliable verifier, or a mistake would be costly to
reverse.

Verification can justify a cheaper attempt. Tests, narrow scope, reversibility,
independent review, and observable acceptance claims reduce the cost of being
wrong. Domain labels such as security, persistence, migration, or public API do
not by themselves prohibit a cheap exploratory run.

A cheap candidate is not automatically a trusted result. Apply review and
proof proportional to the consequence of accepting it. Important work may
begin with cheap exploration while a balanced or strong agent owns integration,
validation, or the final decision.

## Portfolios And Escalation

Prefer several cheap attempts when approaches can be explored independently
and compared cheaply. Prefer a stronger run when synthesis requires one
coherent reasoning chain or verification would cost more than stronger
generation. A common portfolio is cheap exploration, automated rejection,
balanced integration or review, and strong synthesis only if consequential
uncertainty remains. Skip stages that add no confidence.

Start cheap when attempts and verification are cheap. Escalate after failed
attempts, inconclusive verification, inability to maintain the required
reasoning, or evidence that synthesis—not generation—is the hard part. Do not
escalate merely because the assignment is called implementation or review.

## Assignment

Start subagents with fresh context. Fork only when essential context cannot be
summarized safely. Give each agent a bounded, self-contained, role-specific
prompt with its scope, authority, evidence, expected output, proof, and
completion condition.

Record the model, effort, why it is sufficient, whether the result is
disposable or authoritative, and how it will be checked. If the preferred
combination is unavailable, record the fallback.
