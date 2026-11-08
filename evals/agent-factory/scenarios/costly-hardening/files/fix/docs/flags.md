# Feature flags

`flagctl.py set <root> <flag> on|off --as <who>` changes a flag, and
`flagctl.py check <root>` fails when a flag is on in production but was set by
someone not in `approvers.txt`. Production deploys run `check` first.

## Formats

Deployments store flags in `flags.json` (v2). Each flag keeps its value, who
set it and an append-only history; `load` refuses a file whose current value
is not the last history entry, so a hand edit cannot change who set a flag.

Older deployments stored one event file per change in `flags.d/` (v1). Run
`flagctl.py migrate <root>` to fold them into `flags.json`. Until a
deployment migrates, the same commands read `flags.d` directly. The v1 read
path is temporary and will be removed once every deployment has migrated.

### The v1 ledger

A v1 deployment now refuses the hand edits v2 refuses. Each event file that
`set` writes is recorded in `flags.d/.ledger`, one line per event:

    <seq> <flag> <sha256 of the event file> <chain>

`chain` is the sha256 of the previous line's chain followed by the line's
other fields, starting from 64 zeros, so no line can be removed, reordered or
changed without breaking every later one. `load`, `set`, `check` and
`migrate` verify the ledger first and refuse when:

- an event file the ledger records is missing (deleted by hand);
- an event file's contents no longer match its recorded hash;
- an event file is present that the ledger does not record (added by hand);
- the chain does not recompute.

A deployment whose `flags.d` predates the ledger has none, and is read as
before until someone runs `flagctl.py ledger rebuild <root>`. Rebuilding
trusts the event files as they are at that moment and writes
`.ledger-rebuilt` to say so. `flagctl.py ledger verify <root>` checks a
deployment without changing it.

`migrate` verifies the ledger before folding events into `flags.json`, so a
tampered deployment cannot carry its edit into v2's history. The ledger is
deleted with the rest of `flags.d`.

| Deployment | Format |
| --- | --- |
| prod-us | v2 |
| prod-eu | v2 |
| staging-us | v2 |
| staging-eu | v1, migrates with the 2026-11-10 release |
