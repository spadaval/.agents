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

| Deployment | Format |
| --- | --- |
| prod-us | v2 |
| prod-eu | v2 |
| staging-us | v2 |
| staging-eu | v1, migrates with the 2026-11-10 release |
