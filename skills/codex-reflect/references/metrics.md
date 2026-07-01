# Metrics and Evidence Semantics

## Tokens

Use the final `token_count` snapshot in the selected event window. A parent
filtered with `--since` or `--until` reports the final snapshot inside that
window. Detected linked-child sessions are reported as whole-session totals;
they are not automatically bounded to the parent window. State this difference
before presenting a combined total as mission-wide.

## Detected Linked Sessions

`linked_session_ids` is the legacy ID-only list. `linked_session_evidence`
adds the evidence source and confidence, while `detected_linked_session_count`
counts unique candidate IDs.

- `strong`: an ID appeared in a function-call output containing `agent_id`.
- `weak`: an ID appeared only in a user or agent message containing `subagent`
  or `agent_`.

Neither confidence level proves that the candidate was a subagent for the
questioned task. Read the parent delegation and child handoff events before
using “subagent,” “child,” or “mission-wide total.” If a detected transcript is
missing, report it as incomplete evidence rather than estimating its use.

## Session Lineage

`source_thread_id` in a `<codex_delegation>` block identifies the session that
delegated the candidate run. Follow that link repeatedly to select the root
session for a workstream retrospective. `create_thread` outputs and
`subagent_notification` events establish downstream work; inspect them to
separate a mission root from its worker, reviewer, and validation sessions.

## Other Metrics

- Duration is elapsed time between selected logged events, not active work.
- Long gaps are gaps of at least 60 seconds between logged events; they do not
  prove waiting, idleness, or a stalled process.
- Tool counts cover parsed tool-call events. Detected failures require a parsed
  nonzero exit code in captured output, so they do not cover every tool error.
- Paths under patches come from `patch_apply_end` events only. They are not a
  complete worktree or commit diff.

## Failure Response Evidence

`failure_events` records observable signals: nonzero exits, structured error
or failure payloads, unmatched tool calls, and failed patch applications. Each
event includes the preceding and next agent messages, plus the next action and
an observable follow-up pattern such as an unchanged retry, modified retry,
fallback tool call, user escalation, or no follow-up.

These fields do not determine whether the agent understood the failure,
diagnosed it correctly, or was confused. Make those judgments only after
reading the captured output and response context. Describe the result as
“recovery observed” only when the follow-up has no failure signal; otherwise
state the observed signal and uncertainty.

## Operational Dashboard

`operational_metrics` reports parsed tool calls, completed calls, calls without
a detected failure signal, failure signals, observed recoveries, patch events,
and failed patches. Clean tool-completion and recovery rates are heuristics:
they use only calls or recoveries with observable output and do not prove task
or mission success.

`detected_spawned_subagent_count` is limited to direct spawn evidence: an
`agent_id` function output or a `<subagent_notification>` `agent_path`. It is
not the same as the broader detected linked-session count. State mission and
workstream outcomes only after reviewing root evidence and handoffs.

Use qualified language: “the transcript records,” “the helper detected,” or
“the event gap suggests.” Do not upgrade incomplete logs into certainty.
