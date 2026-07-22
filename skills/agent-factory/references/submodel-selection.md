# Submodel Selection

Use this reference to allocate model capability and run quantity for delegated
Agent Factory work. Optimize for the total expected cost and elapsed time of
reaching a trustworthy result, not the quality of one run in isolation.

## Capability Source

Treat the runtime model catalog as authoritative. Select only models and
reasoning efforts that the current environment exposes. Every delegation must
set both values explicitly; never rely on inheritance or defaults. If the
delegation surface cannot set both values, keep the work local unless a human
explicitly directs an exception. Record any such exception rather than
inventing a selection.

Map the exposed models to three tiers:

| Tier | Use when |
| --- | --- |
| Cheapest | Residual ambiguity, complexity, and risk are low; the task is bounded and its output is cheap to verify. Raise effort only for a real multi-step dependency inside that bounded task. |
| Mid | One or more dimensions are moderate, or initially high dimensions have been contained through decomposition, concrete acceptance criteria, reversibility, tests, or independent review. Raise effort for difficult but still bounded reasoning. |
| Strongest | Residual ambiguity is high, complexity is irreducible, risk remains materially uncontained, or several dimensions are high at once. Reserve the maximum effort for the hardest long-chain reasoning or primary orchestration of a genuinely complex multi-agent workstream. |

The strongest tier is not a substitute for a bounded, single-role assignment.

Domain labels do not select the tier by themselves. A bounded persistence,
security, migration, or public-contract change can use the mid tier when the
decision is already resolved and strong proof contains the risk. Conversely, a
small diff can require the strongest tier when its meaning is ambiguous and
subtle errors lack a cheap detection oracle.

Price per token understates the cost of a tier. Weaker models routinely need
more turns to finish multi-step work, and elapsed time and context cost scale
with turns. When in doubt, treat the mid tier as the floor for review and for
implementation from prose descriptions; the cheapest tier fits
transcription-like assignments, where the exact content to produce is already
in the prompt, and single-file mechanical changes.

## Decision Space

Assess three dimensions before selecting a model:

1. **Ambiguity:** How uncertain are the problem, constraints, evidence, or
   correct approach?
2. **Complexity:** How much interconnected reasoning must remain coherent, and
   how much of it is genuinely indivisible?
3. **Risk:** What is the impact of a plausible mistake, and how likely is that
   mistake to escape detection?

First assess the raw task, then reduce each dimension where possible:

- Reduce ambiguity with reconnaissance, competing hypotheses, prototypes, or
  targeted experiments.
- Reduce complexity with clean decomposition, explicit ownership, stable
  interfaces, and staged integration.
- Reduce risk with reversibility, deterministic tests, bounded blast radius,
  independent review, and observable acceptance claims.

Select the tier from the **residual ambiguity, irreducible complexity, and
uncontained risk**. As any residual dimension increases, move toward more
capable models; when several are high, prefer the strongest tier. Do not use a
larger model to compensate for missing scope, context, acceptance criteria, or
proof design.

## Quantity Versus Capability

Model runs are a portfolio. As a planning heuristic, roughly two mid-tier runs
can often be purchased for one strongest-tier run, and many more cheapest-tier
runs can fit in the same budget. Use that exchange rate when breadth or
independence has higher expected value than deeper reasoning in a single run.

Prefer multiple smaller runs when:

- the work decomposes cleanly or several hypotheses can be explored in
  parallel;
- experiments are cheap, reversible, and informative;
- outputs can be compared with an objective or inexpensive verifier;
- independent attempts reduce correlated mistakes; or
- discovery breadth matters more than maintaining one long reasoning chain.

Prefer a stronger single run when:

- the problem is tightly coupled and decomposition would discard essential
  context;
- the difficult part is synthesis rather than generation;
- subtle errors cannot be recognized cheaply;
- coordination cost approaches the cost of doing the work; or
- a plausible mistake remains both high-impact and hard to reverse.

Do not assume that independent review automatically requires the strongest
tier. Two independent mid-tier runs can be stronger than one strongest-tier run
when evidence is objective. A useful portfolio for uncertain work is many
cheapest- or mid-tier explorations, mid-tier convergence and implementation,
then strongest-tier synthesis or validation only if residual difficulty still
warrants it.

## Escalation

Start with the smallest credible portfolio when iteration and verification are
cheap. Escalate capability when experiments fail to reduce ambiguity, bounded
agents cannot maintain the required reasoning, review repeatedly exposes
semantic defects, or the remaining risk lacks a reliable verifier. Escalate
quantity when the next useful step is broader search, independent replication,
or competing experiments.

## Assignment Record

Record the explicitly selected model, reasoning effort, routing rationale, and
any runtime fallback in the delegated assignment. State the residual ambiguity,
complexity, and risk that justify the choice, plus why one stronger run or
several smaller runs is the better portfolio. If the preferred combination is
unavailable, choose the nearest portfolio that can still produce trustworthy
proof and state the constraint.

The assignment prompt must be self-contained and role-specific. State the
repository and workspace, assigned subskill, scope and ownership, evidence
sources, required output and proof, prohibitions, independence requirements,
and completion condition. Do not use inherited conversation context to repair
an underspecified prompt.

Start subagents with fresh context. `fork_context` (or `fork_turns`) should
almost never be enabled: it increases context cost, weakens role isolation, and
can import stale instructions or conclusions. Fork only when essential context
cannot be summarized safely, and record the concrete reason before spawning.
