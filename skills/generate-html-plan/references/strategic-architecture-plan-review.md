# Strategic Architecture Plan Review

Use this review for an HTML plan whose primary purpose is to communicate a
target architecture and the decisions governing it. Adapt the questions to the
domain; explicitly mark an irrelevant concern rather than inventing content.

## Content gate

Before implementing the app, make a private coverage map:

| Source claim | Reader question | Visible destination | Required fidelity | Adjacent owner or non-responsibility | Primary form | Disposition and reason | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

Use `preserve`, `rename`, `move`, or `remove` as the disposition. Give a reason
for removed or reduced-detail claims. Renaming a confusing term must not delete
the responsibility it represented.

Default to the canonical source's conceptual order. When no useful source
structure exists, use this spine as a starting point:

1. **Outcome:** the problem, intended change, goals, and valuable partial
   outcomes.
2. **Target system:** ownership and external API, authored knowledge or
   configuration, runtime behavior, state and persistence, automation or model
   responsibilities, and the returned result.
3. **Governing decisions:** consequential choices, rationale, and practical
   consequences.
4. **Boundaries:** in scope, out of scope, compatibility, and safety limits.
5. **Adaptation:** what must remain fixed, what implementers may change, and
   what evidence should reopen the strategy.
6. **Assurance:** observable claims and the evidence needed to prove them.
7. **Delivery:** dependency order, coexistence, rollout, and intentionally
   deferred decisions.

This is a reasoning checklist, not a mandatory page template. Combine or omit
sections when doing so makes the architecture easier to understand without
losing their claims.

Do not start visual implementation until the planned visible content lets the
intended reader answer the relevant questions. Its opening must establish why
the current approach fails, the intended outcome, and the governing decisions,
without requiring a particular summary component or prose template.

- What outcome does this architecture seek, and what problem does it solve?
- Who owns the external contract and the core decisions?
- What is authored ahead of time, and what exists only during execution?
- How does one representative request move through the system?
- What state is retained, where, and why?
- Which decisions are deterministic, automated, model-driven, or human-owned?
- What result is returned, including uncertainty and limitations?
- Which choices are fixed, flexible, deferred, or explicitly out of scope?
- What evidence would show that the prototype or system works?

## Visual gate

For each proposed visual, write down the single question it answers. Split
component boundaries, authored topology, runtime flow, state, and delivery
unless their relationship is itself the subject.

The visible prose must establish the concepts before the visual. The visual
then makes a relationship easier to perceive. Ensure boundaries are visually
distinguishable, edge direction is meaningful, and every terminal outcome has
an explicit destination.

## Concrete exchange gate

When the plan includes APIs, records, messages, or agent decisions, use one
representative end-to-end exchange. At each relevant stage, identify:

- the current owner and why it was selected;
- concrete input or state;
- the action or call;
- the result, interpretation, and uncertainty;
- whether control calls, returns, continues, or stops;
- the next owner.

Identify code as literal source, an executed-path excerpt, or illustrative
pseudocode, and explain why it runs. Raw payloads and statuses are supporting
detail; they must not carry the only visible meaning.

## Coherence gate

Before delivery:

1. Account for every paragraph, diagram, table, and callout as a primary claim,
   necessary rationale or boundary, or evidence. Remove page-description prose
   and adjacent representations that repeat the same answer.
2. Ignore all diagrams and interactive details, then read the visible prose in
   order. The architecture and its rationale should remain coherent.
3. Check every heading and label against repository language. Replace invented
   metaphors with established terms or plain descriptions.
4. Remove visible instructions about clicking, selecting, or how the page was
   designed. Keep negative boundary statements only when they name prohibited
   behavior and its consequence or tradeoff.
