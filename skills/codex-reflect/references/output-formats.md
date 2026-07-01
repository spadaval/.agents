# STAR-I Output Format

Use this structure, in this order, for every user-facing analysis. Omit a
section only when it is irrelevant to the specific question; do not reorder
included sections.

```markdown
# Codex Run Retrospective

## Situation
[Task context, session IDs and paths, analysis window, constraints, and
verification limits.]

## Run at a Glance
[Tool calls, heuristic clean-completion and recovery rates, failure signals,
patches, detected spawned subagents, token totals, and mission outcome status.]

## Task
[What the run needed to achieve, including proof or validation expectations.]

## Actions
[Major decisions, tool use, delegation, failure-response evidence, recoveries,
and relevant resource usage.]

## Results
[Delivered outcome, validation evidence, unresolved gaps, and qualified
conclusions.]

## Improvements

### [Short improvement title]
**Context:** [The observed problem or effective behavior, its impact, and the
supporting session/event evidence.]

**Change:** [The smallest concrete change to code, tooling, guidance, skill,
or orchestration.]

**Payoff:** [How the change addresses the context and what it should improve.]

Add a `**Validation:**` line only when there is a material, testable check for
the change. Group several cards under `### Code`, `### Tooling`, `### Guidance`,
`### Skills`, or `### Orchestration` only when that makes a long retrospective
easier to scan. Do not turn every observation into a card.
```

For a narrow question, retain `Situation` and include only the relevant later
sections. Put tokens, tool activity, and detected linked sessions in `Actions`
when they explain what happened or influenced a result; otherwise omit them.

Do not turn operational rates into a synthetic mission-success percentage.
State mission and workstream outcomes separately in `Results`, using reviewed
root evidence and handoffs.

Every included finding must name a session ID or path and a timestamp, line,
command, patch, or event that supports it. Label missing, ambiguous, or
inferred evidence explicitly. Treat detected linked sessions as candidates
until the parent delegation and child handoff establish the relationship.

## Interactive Artifact

The helper writes `report.html` beside this Markdown pack. It is a
self-contained, dependency-free exploration view: summary metrics, a grouped
timeline, a filterable failure table with immediate-response evidence, session
groups/lineage, and tool activity. Treat it as a navigation and evidence
surface, not an editorial report. Keep causal interpretation and
Context/Change/Payoff cards in the user-facing retrospective.

In the chat response, give the reviewed outcome, the few findings that matter,
material caveats, and a link to `report.html`; do not replace the response with
an artifact receipt unless the user asks for artifact-only output.

## Multi-Agent Runs: Hierarchical STAR-I

Keep one STAR-I narrative at the root session. In `Actions`, organize work by
parallel workstream, not by the chronology of every child session:

```markdown
### Workstream: [outcome-oriented name]
- Owner/session:
- Goal:
- Key actions and handoff:
- Evidence:
- Status:
```

In `Results`, use an outcome matrix when multiple mission objectives or
workstreams must be compared:

```markdown
| Objective | Workstream | Result | Evidence | Remaining risk |
| --- | --- | --- | --- | --- |
```

Keep `Improvements` systemic: group compact Context/Change/Payoff cards by
code, tooling, guidance, skills, or orchestration rather than assigning one
recommendation to every child session.

Create a child-level mini STAR-I only when it materially affected the mission:
it changed direction, found a defect, failed to recover, supplied critical
proof, or consumed disproportionate time or tokens. Otherwise summarize the
child in its workstream card and keep the full evidence in the analysis pack.
