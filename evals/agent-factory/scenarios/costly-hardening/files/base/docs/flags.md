# Feature flags

`flagctl.py set <root> <flag> on|off --as <who>` changes a flag, and
`flagctl.py check <root>` fails when a flag is on in production but was set by
someone not in `approvers.txt`. Production deploys run `check` first.

## Formats

Deployments store flags in `flags.json` (v2). Each flag keeps its value, who
set it and an append-only history; `load` refuses a file whose current value
is not the last history entry, so a hand edit cannot change who set a flag.
