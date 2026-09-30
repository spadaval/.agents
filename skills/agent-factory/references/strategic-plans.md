# Strategic Plans

A strategic plan states a mission's governing intent: why it exists, what
must be true when it is done, the shape and boundaries of the solution, and
who may change what. Every agent working on the mission reads it, so it has
to stay short, stable, and at a high altitude.

Write one as a file when a mission is long-running, spans several epics or
systems, or involves contested tradeoffs. For smaller work, put the same
sections in the mission issue body instead of a separate file.

## Size and Altitude

Aim for about 150 lines or fewer. A strategy that grows past that is usually
holding material that belongs elsewhere, such as design detail, a task plan,
status, or history. That material changes often, which forces constant
revisions and buries the parts that should not change.

A useful test: if a statement would have to change whenever the plan changes,
because it describes tasks, order, or status, it is not strategy.

| Material | Where it belongs |
| --- | --- |
| Outcome, success criteria, key decisions, boundaries, authority | The strategy |
| Detailed design: components, APIs, data models, diagrams | Architecture docs, or a design doc linked from an epic |
| Rationale for a hard-to-reverse decision | An ADR, linked from the strategy |
| Work packages ("briefs", workstreams) | Epics in the tracker |
| Sequencing, ordering rules, dependencies | Tracker dependencies and epic bodies |
| Status, progress, what is done | The tracker: item state and mission status comments |
| Analysis of the starting point | An `audit` result or the first epic. Summarize it in one or two sentences under Why if it motivates the mission. |
| Evidence and results | Evidence comments on the tracker item |
| History of changes | Git history and commit messages, plus one "Last changed" line |

## Template

```md
---
status: draft | active | completed | superseded
mission: <tracker link>
last_changed: "<date>: <one-line summary>"
---

# Why
The problem and why it is worth solving now. Two to five sentences.

# Outcome
What is true when the mission is done, stated so someone could observe it.
Note any partial outcome that would still be worth shipping.

# Success Criteria
Numbered, observable claims (S1, S2, ...). Epics and validation refer to these
numbers. For each, say how it will be shown, such as a test, scenario, or
measurement.

# Shape
The key decisions that constrain the solution, each in a sentence or two,
linking to ADRs and architecture docs for detail. State what wins when
qualities conflict.

# Scope
In scope, out of scope, and the actual target environment and exposure.

# Authority
What the orchestrator may change without asking, and what must come back to
a human.

# Risks and Unknowns
What could invalidate the plan, and what will be learned first to reduce it.
```

Leave out any section that says nothing.

## Example

```md
---
status: active
mission: https://github.com/acme/shop/issues/412
last_changed: "2026-09-12: S1 latency target relaxed to 2s (user direction)"
---

# Why
Order status pages poll the API every 2 seconds. Polling is a large share of
API traffic, and customers still see status changes late.

# Outcome
Order status pages update within seconds of a change without polling, and
the web client's polling code is removed.

# Success Criteria
- S1: A status change appears on an open order page within 2s (p95), shown
  by an end-to-end test and a staging measurement.
- S2: The web client makes no status polling requests (network trace).
- S3: Pages recover after a dropped connection without a reload (scenario
  test that kills the connection).
- S4: Web client polling code is deleted. The API polling endpoint stays for
  mobile clients, and its removal is owned by mission #430.

# Shape
- Server-sent events from the existing API service; no new service or broker
  (ADR-031).
- The order service remains the only source of status; the stream only
  relays its change events.
- Correctness wins over latency: on reconnect the client refetches status
  before trusting the stream.

# Scope
In: web client order pages, API streaming endpoint, web client polling
removal.
Out: mobile apps (they keep polling until mission #430), other pages.
Environment: production behind the existing load balancer.

# Authority
The orchestrator may change the epic breakdown, sequencing, and the
streaming library. Changes to S1–S4, adding infrastructure, or touching
mobile clients need the product owner.

# Risks and Unknowns
- Load balancer idle timeouts may cut long-lived connections. A spike in the
  first epic measures this before client work starts.
```

## Changing It

A strategy changes only with the authority in the
[Constitution](../constitution.md#strategy-changes-deliberately): a human
directs the change, or the Authority section allows it.

To change it, edit the file in place and update the `last_changed` line. In
the commit message, say what changed, why, and on whose authority. Post a
short comment on the mission issue. Git holds the full history, so do not
keep revision logs or snapshot copies in the document. Tracker items link to
the strategy file, not to a revision number, so the links never go stale.
After a change, reconcile the affected tracker work before dispatching more.

If a change supersedes an accepted ADR, write the superseding ADR as part of
the same change.

## Planning Incrementally

Plan the whole mission as outcomes, but create executable issues only up to
the nearest evidence boundary. That is the point beyond which unfinished
work, validation results, or an open decision could change the route. Keep
later epics as drafts with a preliminary outcome and known unknowns, and
expand each one when evidence justifies it. See
[Tracker Records](tracker-records.md) for what each record contains.

Close the mission against its success criteria, not the number of issues
closed.
