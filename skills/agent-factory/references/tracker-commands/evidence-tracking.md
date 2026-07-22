# Evidence Tracking

Use this reference to record, attach, inspect, or classify durable proof. Agent
Factory procedures decide what deserves evidence and whether independence is
required.

## First-Class Evidence

First-class evidence is a durable receipt recorded in the tracker itself — an
`atelier evidence record` or a structured issue comment with claim, action,
result, and artifact links — not prose inside a status update. When a procedure
requires first-class evidence, create the receipt and cite its ID or URL.

## Failure Classification

Classify every non-pass validation or migration result with exactly one of:

- in-scope defect
- expected migration breakage
- environment/tooling failure
- pre-existing failure
- deferred with owner
- not applicable

Use these terms verbatim so evidence stays searchable across trackers.

## Atelier

- Use `atelier evidence record` for manual proof or captured command output.
- Use `atelier evidence show` and `list` to inspect receipts, and `attach` only
  when reusing an existing receipt on another accountable target.
- Associate evidence with the mission, epic, or issue it actually supports and
  record the producer, role, kind, summary, path, or URI when relevant.
- Consult `atelier help evidence` and focused subcommand help for current fields.

## GitHub Issues

- Record an evidence receipt as a structured comment on the accountable issue
  with the claim, action, result, and transcript or artifact links. Use
  `gh issue comment <number> --body-file <file>` for non-interactive capture.
- Use the stable comment URL as the evidence reference. Link Actions runs,
  check results, commits, pull requests, screenshots, or other durable artifacts
  rather than pasting large transcripts into the issue body.
- For independent validation, identify the validator and classify each relevant
  claim as `pass`, `fail`, `blocked`, `deferred`, or `not-applicable`.
- Append a correction or superseding receipt instead of silently rewriting
  evidence on which later work may rely.
