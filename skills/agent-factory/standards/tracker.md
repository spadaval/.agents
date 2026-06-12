# Tracker Reference

Load `AGENTFACTORY.md` first and use the bound tracker it names.

The tracker owns scope, outcomes, evidence expectations, status, dependencies,
and handoff.
Do not replace it with private notes or TODO files.

## Command Routing

Use bound tracker commands for:

- planning: create, split, reparent, label, prioritize, and search work;
- mission focus: inspect active mission status, linked work, blockers,
  evidence, and readiness options;
- ready: list executable items with no open blockers;
- work lifecycle: create or locate the worktree, start tracked work, and finish
  tracked work;
- evidence: create concise validation records and attach them to issues,
  missions, or other target records;
- policy checks: evaluate issue or mission transition policy when the binding,
  assignment, or closeout contract explicitly requires it;
- update: claim work, edit fields, append durable notes, and record handoff;
- dependency: add or remove real blocker relationships;
- close: mark completed work with a reason;
- lint: validate tracker records globally or for one item;
- sync/check: export, lint, and health.

Do not use interactive tracker commands. Prefer explicit command flags that can
run unattended.

## Atelier Binding

For Atelier repositories, use the concrete commands in `AGENTFACTORY.md`.
Dependency direction is `atelier issue block <blocked-id> <blocker-id>`: the
first item waits on the second. Commit durable tracker state with related work.
Runtime state is rebuildable.

## Atelier Mission And Work Standard

Use missions as the durable active-focus record. Select worker issues from the
active mission graph. Use the global ready list only for discovery.

Use `atelier mission status <mission-id>` for ready work, blockers, evidence
gaps, policy-check gaps, deferred work, and closeout. Use `show`, `list`,
`ready`, and `status` commands for normal planning and drill-down. Do not plan
or validate by parsing command-result JSON, and do not treat raw workflow
validator output as ordinary user-facing proof.

Worker flow:

```bash
atelier issue show <id>
atelier mission show <mission-id>
atelier worktree for <id>
atelier issue update <id> --claim
atelier start <id>
# implement owned slice and run proof
atelier evidence add --kind <kind> --result <result> "summary"
atelier evidence attach <evidence-id> issue <id>
atelier finish <id>
```

If work cannot finish, leave handoff notes, attach useful evidence, and keep the
item open.

Run advanced workflow validators only when the repository binding, assignment,
or parent closeout contract asks for them. A passing validator is a policy
signal; it does not replace proof attached to the issue.

Before mission closeout, run:

```bash
atelier mission status <mission-id>
atelier lint
atelier doctor
atelier export --check
```

If the binding requires a mission workflow validator, run it as an explicit
advanced policy check after the mission contract audit has mapped parent
Outcome lines to linked work and attached evidence.

## Ready Item Standard

A ready executable item answers:

- what is changing;
- why the work exists;
- what is in scope and out of scope;
- how to prove completion;
- expected breakage and the owner for reconnect/closeout;
- assigned subskill when not obvious.

Write tracker items using
[work-item-authoring.md](work-item-authoring.md): Outcome describes the desired
finished world, Evidence describes proof an independent validator could use,
and Notes carry context or non-goals. Do not encode a rigid implementation plan
unless the exact implementation path is the decision being tracked.

Ordinary work closes with proof on the owning issue. Risky, broad,
public-contract, process-policy, parent-level, epic, and mission claims require
first-class evidence and should name independent validation or review where the
implementer should not be the sole validator.

For mission readiness, unresolved high-consequence choices block mission start.
Track durable resolution as artifact-update tasks.

Do not assign vague, oversized, ambiguous, or multi-deliverable items.
