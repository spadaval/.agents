# Tracker Reference

Agent Factory uses a repository-bound tracker abstraction, not a hard-coded
queue. Load `AGENTFACTORY.md` first and use the tracker, durable state path,
runtime state path, sync/check commands, lint commands, and archival fallback it
names.

The bound tracker preserves scope, acceptance criteria, status, follow-up work,
dependencies, and handoff outside chat. Do not replace it with private notes or
ad hoc TODO files.

## Command Routing

Use the bound tracker commands for these operations:

- planning: create, split, reparent, label, prioritize, and search work;
- ready: list executable items with no open blockers;
- update: claim work, edit fields, append durable notes, and record handoff;
- dependency: add or remove real blocker relationships;
- close: mark completed work with a reason;
- lint: validate tracker records globally or for one item;
- sync/check: export or verify committed tracker state and run tracker health.

Do not use interactive tracker commands. Prefer explicit command flags that can
run unattended.

## Atelier Binding

Repositories can bind Agent Factory to Atelier. In that case, use `atelier`
commands from `AGENTFACTORY.md`; if the CLI is not on `PATH`, use the repository
path or setup command named by the binding.

Core Atelier examples:

```bash
atelier issue create "Implement focused slice" --issue-type task --parent <epic-id>
atelier issue subissue <epic-id> "Validate integrated behavior" --issue-type validation
atelier issue list --status open
atelier issue ready
atelier issue show <id>
atelier issue search "<topic>"
atelier issue update <id> --claim
atelier issue update <id> --append-notes "..."
atelier issue update <child-id> --parent <epic-id>
atelier issue block <blocked-id> <blocker-id>
atelier issue unblock <blocked-id> <blocker-id>
atelier issue close <id> --reason "..."
atelier export
atelier export --check
atelier lint
atelier lint <id>
atelier doctor
```

Atelier dependency direction is `atelier issue block <blocked-id> <blocker-id>`:
the first item is waiting on the second. Use `atelier issue unblock` to remove
that relationship.

Committed durable state is normally `.atelier-state/`. Local runtime state is
normally `.atelier/state.db` and can be rebuilt according to the repository
binding. Commit exported tracker state with related work or in a tracker-only
commit.

## Ready Item Standard

A ready executable tracker item answers, without private context:

- what package, app, workflow, file area, interface, or owner is changing;
- why the work exists;
- what is in scope and out of scope;
- what acceptance criteria define done and how to prove them;
- which parent epic validation criterion the item advances, when applicable;
- what docs or ADRs are relevant, when needed;
- whether downstream breakage is expected;
- which item owns later reconnect or closeout, when breakage is expected;
- which agent-factory subskill is recommended, when assignment is non-obvious.

Do not leave vague executable items in the ready queue. If an item is too large,
ambiguous, missing prerequisites, or hiding several deliverables, reshape it
before treating it as executable.

## Legacy Beads Fallback

Use Beads commands only when `AGENTFACTORY.md` explicitly binds the repository to
Beads, or when archived Beads data must be inspected for recovery or audit. See
[beads.md](beads.md) for legacy command mechanics. Do not infer Beads as the
default for new repositories.
