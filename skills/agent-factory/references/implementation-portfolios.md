# Implementation Portfolios

Use an implementation portfolio when constructing code can reduce meaningful
uncertainty, when more than one construction could be informative, or when a
working candidate may not be suitable for integration. The orchestrating
Manager chooses the portfolio; this reference does not prescribe a model or a
default number of implementations.

## Principle

Treat implementation as both production work and an evidence-producing act.
Working behavior, construction quality, and learning value are separate. A
candidate can succeed at one and fail at another.

## Strategies

| Strategy | Use for |
| --- | --- |
| Direct implementation | The path is understood and another candidate would add little information. |
| Exploratory spike | Answer a feasibility, behavior, performance, or integration question; production use is not presumed. |
| Refactor candidate | Preserve a sound behavioral and structural core while improving construction in place. |
| Reimplement | Carry forward evidence and discoveries while abandoning an unsuitable construction. |
| Parallel implementations | Explore materially different approaches or reduce anchoring on one candidate. |
| Hybrid portfolio | Combine strategies, such as parallel spikes followed by one production candidate. |

Choose based on the uncertainty being reduced, the expected information value,
the cost and reversibility of candidates, external side effects, available
oracles, and whether the current structure is salvageable. Do not manufacture
alternatives when another candidate would not change the decision.

## Candidate Contract

For every implementation candidate dispatched under this reference, add these
fields to its assignment, using `none` where a relationship does not apply:

```text
Implementation strategy: <direct | spike | refactor | reimplement | parallel | hybrid>
Candidate relationship: <none | follows candidate or evidence | parallel with candidates>
Learning question: <what constructing this candidate should establish>
Prior-candidate visibility: <full | evidence only | none>
Expected disposition: <integration candidate | evidence only | comparison candidate>
Disposition owner: <orchestrating Manager>
```

Match visibility to the purpose. A reimplementation may consume discoveries
from an earlier candidate without inheriting its code or design. Parallel
candidates may need the same contract and raw artifacts but isolation from one
another. Name the boundary; do not claim independence after crossing it.

## Assessment And Disposition

Assess each candidate on three axes:

1. **Behavior**: what the candidate demonstrably does.
2. **Construction**: whether its boundaries, ownership, simplicity,
   maintainability, safety, and residue fit the target system.
3. **Learning**: what building it established, falsified, or made newly
   uncertain.

Then classify the candidate:

- **integrate**: behavior and construction are suitable;
- **refactor**: the construction is salvageable within the current assignment
  or implementation plan;
- **reimplement**: the learning is useful but the construction should not be
  preserved;
- **retain**: keep it temporarily for comparison or assigned follow-up;
- **discard**: preserve its learning but do not use the code; or
- **blocked**: a requirement, authority, safety, or strategic question prevents
  a valid disposition.

Selection remains subject to governing strategy and decisions. If candidates
expose conflicting requirements or materially different strategic boundaries,
route the conflict to the owning layer instead of selecting a preferred
tradeoff locally. Candidate comparison does not replace review or validation.

## Learning Receipt

Before superseding or discarding a candidate that produced decision-relevant
evidence, preserve the information needed by the next agent:

```text
Question investigated:
Candidate and result:
Observed behavior and evidence:
Constraints discovered:
Failed assumptions:
Reusable tests, fixtures, or measurements:
Construction problems:
Disposition and rationale:
Follow-up:
```

Keep the receipt in the tracker or repository-owned evidence destination. Do
not retain rejected production paths, compatibility shims, or duplicate
implementations merely to preserve their history. Workspace retention, discard,
and deletion follow repository policy and human authority. If the candidate
produced no decision-relevant learning, record that result and its disposition
in the ordinary handoff.
