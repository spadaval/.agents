# Submodel Selection

Use this reference when choosing a model and reasoning effort for delegated
Agent Factory work. Select the lowest tier that can credibly complete the
assignment and its required proof.

## Capability Source

Treat the runtime model catalog as authoritative. Select only models and
reasoning efforts that the current environment exposes. Every delegation must
set both values explicitly; never rely on inheritance or defaults. If the
delegation surface cannot set both values, keep the work local unless a human
explicitly directs an exception. Record any such exception rather than
inventing a selection.

The current GPT-5.6 routing tiers are:

| Model | Default effort | Use when |
| --- | --- | --- |
| `gpt-5.6-luna` | `low` | Work is bounded, low-ambiguity, and low-risk, with concrete output and proof: focused reconnaissance, mechanical documentation, narrow test execution, or evidence collection. Use `medium` only for a real multi-step dependency inside that bounded task. |
| `gpt-5.6-terra` | `medium` | Normal implementation, debugging, review, validation, or documentation work with clear local scope. Use `high` for difficult debugging, a non-trivial local refactor, or independent review with meaningful failure impact. |
| `gpt-5.6-sol` | `high` | Ambiguous or high-risk work involving architecture, public contracts, persistence, security, migration, broad refactors, complex review, or adversarial validation. Use `max` for the hardest long-chain reasoning when the runtime supports it. |

Reserve `gpt-5.6-sol` with `ultra` for primary orchestration of a genuinely
complex multi-agent workstream, and only when the runtime exposes that effort.
It is not a substitute for a bounded, single-role assignment.

Prefer the smaller capable tier for high-volume, bounded work such as reading
logs, scanning many files, inventorying references, extracting facts, and
collecting evidence. Scale the model or effort only when ambiguity, risk, or
the judgment required by the proof warrants it.

## Routing Test

Consider these dimensions together:

1. Ambiguity: Are the outcome and constraints already decided?
2. Risk: What is the impact of a plausible mistake?
3. Scope: Is the work local, cross-cutting, or architectural?
4. Independence: Must the agent challenge an implementation or parent claim?
5. Proof: How much judgment is needed to establish the result?

Increase the tier or effort only when those dimensions require it. Do not use a
larger model to compensate for missing acceptance criteria, ownership, or
repository context; resolve those assignment gaps first.

## Assignment Record

Record the explicitly selected model, reasoning effort, routing rationale, and
any runtime fallback in the delegated assignment. If the preferred combination
is unavailable, choose the nearest available tier that still meets the risk and
proof needs and state the constraint.

The assignment prompt must be self-contained and role-specific. State the
repository and workspace, assigned subskill, scope and ownership, evidence
sources, required output and proof, prohibitions, independence requirements,
and completion condition. Do not use inherited conversation context to repair
an underspecified prompt.

Start subagents with fresh context. `fork_context` (or `fork_turns`) should
almost never be enabled: it increases context cost, weakens role isolation, and
can import stale instructions or conclusions. Fork only when essential context
cannot be summarized safely, and record the concrete reason before spawning.
