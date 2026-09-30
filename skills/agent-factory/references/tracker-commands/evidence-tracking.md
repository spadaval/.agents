# Evidence Tracking

Use this reference to record or inspect proof in the tracker. The procedures
decide what needs recording. As a rule of thumb, record evidence in the tracker
when later work or a later agent will rely on it, for example epic or mission
acceptance, independent validation, migrations, and non-pass results. For
ordinary slices, proof in the PR or handoff is enough.

## Evidence Receipts

An evidence receipt is a durable record in the tracker, not prose buried in a
status update. It states the claim, what was done to check it, the result, and
links to transcripts or artifacts. Cite the receipt's ID or URL.

## Shared Vocabulary

Use these terms verbatim so evidence stays searchable across trackers:

- Claim results: `pass`, `fail`, `blocked`, `not-applicable`.
- Cause of a failure: `defect in this change`, `expected breakage`,
  `environment/tooling`, `pre-existing`. `expected breakage` applies only on
  an isolated rewrite branch declared in the plan, never on the default
  branch.
- Finding dispositions: `FIX NOW`, `DEFER`, `NO ACTION`.

## Atelier

- Use `atelier evidence record` for manual proof or captured command output.
- Use `atelier evidence show` and `list` to inspect receipts. Use `attach` only
  when reusing an existing receipt on another item.
- Attach evidence to the mission, epic, or issue it actually supports, and
  record the producer, role, kind, summary, and path or URI where relevant.
- Check `atelier help evidence` for current fields.

## GitHub Issues

- Record a receipt as a structured comment on the relevant issue, using
  `gh issue comment <number> --body-file <file>` for non-interactive capture.
- Use the comment URL as the evidence reference. Link Actions runs, checks,
  commits, PRs, and screenshots rather than pasting long transcripts.
- For independent validation, name the validator and give each claim a result.
- Correct evidence by appending a new receipt. Do not silently edit evidence
  that later work may rely on.
