# Decide

Use this subskill for a consequential product, architecture, or strategy
choice with more than one credible path, especially one that is costly to
reverse. Routine, reversible implementation choices belong to whoever is doing
the work.

## Method

1. **Frame it.** State the decision, what is at stake, the hard constraints,
   the unknowns, and how reversible each outcome is. Bad framing is the most
   common cause of bad decisions, so check it first.
2. **Gather evidence.** Read the relevant code, docs, and ADRs. Consult
   external sources and user constraints where they matter. Prefer evidence
   over confident assertion.
3. **Lay out options.** Give two or three credible options. For each, state
   its assumptions, benefits, costs, risks, and how many moving parts it adds
   to the system.
4. **Recommend.** Choose the simplest option that satisfies every hard
   constraint. State what is being traded away and what uncertainty remains.

For high-stakes or contested choices, get independent perspectives. Have
separate agents argue for the strongest options and against them, and have
another agent judge. No agent should both advocate and judge the same option.
If subagents are unavailable, do the passes separately and say that
independence was limited. Skip this for decisions where it would not change
your confidence.

## Authority and Recording

If the decision changes strategy, it needs the authority described in the
[Constitution](../constitution.md#strategy-changes-deliberately). Without it,
return a recommendation, not a decision.

Record the decision where its rationale will be needed:

- mission-scoped decisions go in the strategic plan or issue;
- decisions that outlast the mission go in the owning product or architecture
  doc, plus an ADR when the rationale would otherwise be lost or re-argued.

## Handoff

Also report the framing, options considered and why they were rejected, the
strongest dissent, the authority for the decision, and where it is recorded.
Do not implement the choice as part of this subskill.
