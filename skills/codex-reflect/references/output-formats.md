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

### Preserve
[Effective behavior worth retaining or encoding in code, tooling, guidance, or
a skill.]

### Fix
[Evidence-backed problem, its impact, and its likely cause or uncertainty.]

### Change
[Specific improvement, target surface, and validation for the change.]
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

Keep `Improvements` systemic: group recommendations by code, tooling,
guidance, skills, or orchestration rather than assigning one recommendation to
every child session.

Create a child-level mini STAR-I only when it materially affected the mission:
it changed direction, found a defect, failed to recover, supplied critical
proof, or consumed disproportionate time or tokens. Otherwise summarize the
child in its workstream card and keep the full evidence in the analysis pack.
