---
name: decision-lab
description: Use for human-in-the-loop decision workflows, architecture decisions, adversarial option analysis, biased reasoning checks, bad framing recovery, and pre-implementation tradeoff analysis before agents build or plan execution.
argument-hint: "[decision or problem]"
user-invocable: true
---

# Decision Lab

Decision Lab is a human-gated decision workflow. The lab explores and evaluates;
the factory builds. Use this skill when a high-leverage technical, product, or
architecture decision has multiple plausible paths and premature convergence
would be costly.

Do not use this skill to implement the decision. If the work becomes execution,
handoff to the appropriate build, planning, or orchestration skill only after
the human approves or selects a decision.

## Operating Rules

- Use an orchestrator pattern: one agent, one role.
- Keep roles isolated. Do not let the same subagent both advocate for and judge
  an option.
- Prefer evidence over confidence. Cite code, docs, external references, user
  constraints, prior ADRs, or explicit assumptions.
- Actively look for bad framing, motivated reasoning, hidden constraints, and
  false tradeoffs.
- Preserve dissent. Do not smooth over material disagreement just to create a
  clean recommendation.
- Stop after the decision brief. Do not create beads, write ADRs, edit files,
  plan implementation, or hand off to `agent-factory` until the human approves
  or selects the decision.

If subagents are unavailable, run the roles as clearly separated passes and
state that the result did not use independent subagents.

## Workflow

1. **Frame** - Assign a Framer to restate the decision, stakes, constraints,
   non-goals, uncertainty, and what would make the decision reversible or hard
   to reverse.
2. **Research** - Assign a Researcher to gather evidence from the codebase,
   docs, web, external documentation, prior decisions, and user-provided
   context as applicable.
3. **Propose Options** - Assign independent Option Proposers to generate
   viable options. Each option must name assumptions, expected benefits,
   costs, risks, and what evidence would change the recommendation.
4. **Argue In Isolation** - For each serious option, assign one Advocate and
   one Critic. The Advocate makes the strongest case for the option. The Critic
   makes the strongest case against it.
5. **Judge** - Assign a Judge to synthesize the framing, evidence, advocacy,
   criticism, and dissent into a decision brief. The Judge may recommend, but
   must not execute.
6. **Human Gate** - Stop and ask the human to approve the recommendation,
   choose a different option, request more evidence, or reject the framing.
7. **Record After Approval Only** - If the human approves or selects a path,
   a Recorder may translate the decision into an ADR draft, bead plan, spec, or
   `agent-factory` handoff.

## Role Outputs

### Framer

Report:

- decision statement;
- why the decision matters;
- explicit constraints and non-goals;
- assumptions and unknowns;
- candidate success criteria;
- signs the initial framing may be wrong.

### Researcher

Report:

- evidence gathered, with sources;
- current implementation or process facts, when repo-bound;
- prior decisions or constraints that should not be relitigated;
- missing evidence and how costly it would be to obtain.

### Option Proposer

Report one or more options with:

- option name;
- core idea;
- assumptions;
- benefits;
- costs and risks;
- best evidence for or against;
- when this option would be the wrong choice.

### Advocate

Report the strongest good-faith case for exactly one option. Do not compare
every option unless comparison is necessary to defend the assigned option.

### Critic

Report the strongest good-faith case against exactly one option. Focus on
failure modes, hidden costs, weak assumptions, and what could make the option
look good for the wrong reasons.

### Judge

Produce the decision brief and stop at the human gate.

### Recorder

Use only after human approval. Translate the chosen direction into the requested
durable artifact without reopening the decision unless new evidence appears.

## Decision Brief Format

```text
Decision Brief

Problem Framing
- ...

Options Considered
- ...

Evidence Used
- ...

Option Analysis
- Option: ...
  Strongest case for: ...
  Strongest case against: ...

Recommendation
- ...

Dissent And Uncertainty
- ...

Required Human Decision
- Approve recommendation, choose another option, request more evidence, or reject the framing.

Suggested Next Artifact After Approval
- ADR draft, bead plan, spec, agent-factory handoff, or no action.
```

## Agent Factory Compatibility

When operating inside an `agent-factory` repository, Decision Lab may inform
future beads, ADRs, audits, reviews, or orchestration. It is not a substitute
for `agent-factory plan` or `agent-factory orchestrate`.

After human approval:

- use `agent-factory plan` to create or reshape beads;
- use `agent-factory orchestrate` for multi-bead execution;
- use `agent-factory audit` when the decision brief reveals architecture
  quality findings but no solution is approved;
- use `agent-factory docs` when the approved choice only needs durable
  documentation.
