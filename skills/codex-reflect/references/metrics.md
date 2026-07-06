# Metrics and Evidence Semantics

## Tokens

Use the final `token_count` snapshot in the selected event window. A parent
filtered with `--since` or `--until` reports the final snapshot inside that
window. Detected linked-child sessions are reported as whole-session totals;
they are not automatically bounded to the parent window. State this difference
before presenting a combined total as mission-wide.

`turn_context` records the model and reasoning effort active for a turn. For a
session that changes model, attribute tokens by subtracting consecutive
cumulative `token_count` snapshots and assigning each non-negative delta to the
configuration active at that snapshot. Treat a counter decrease as a reset and
start from the new value; never report a negative delta. Attribute snapshots
without a preceding model context to `unknown`. Call these values **attributed
tokens by model**: a model switch between snapshots cannot be divided more
precisely than the available logging permits. The per-model totals should
reconcile to the final logical-session snapshot when counters are monotonic.

## Logical Sessions and Workstreams

A logical session is all rollout JSONL files whose `session_meta.id` is the
same. The helper merges their ordered events before it calculates a timeline,
tool/failure counts, patches, or the final token snapshot. It does not add token
snapshots from resumed files: the latest snapshot in the merged logical session
is the reported total.

A `--workstream` discovers related peer threads through recorded thread
creation/fork links, then follows direct subagent spawns as hierarchical
workstreams within each thread. Its session count and aggregate tokens cover
only the logical sessions present in that discovered graph. Separate the
primary thread and its delegated workstreams from related-thread resources;
describe a combined figure as a “detected related-session total,” not an exact
mission or account-wide cost.

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

## Thread Relations and Delegation

`source_thread_id` in a `<codex_delegation>` block identifies a related thread
that created or handed off to the candidate. Follow it for discovery, but do
not make it a breadcrumb parent. `create_thread` and `fork_thread` produce peer
thread relations. `spawn_agent` outputs and `subagent_notification` events
establish hierarchical delegation to worker, reviewer, and validation
workstreams.

## Other Metrics

- Duration is elapsed time between selected logged events, not active work.
- Long gaps are gaps of at least 60 seconds between logged events; they do not
  prove waiting, idleness, or a stalled process.
- Tool counts cover parsed tool-call events. Detected failures require a parsed
  nonzero exit code in captured output, so they do not cover every tool error.
- Paths under patches come from `patch_apply_end` events only. They are not a
  complete worktree or commit diff.

## Report Resource Summaries

The analyzed viewer reports each detected logical session separately. Use the
final token snapshot for that session and show total, input, cached input,
uncached input, output, and reasoning tokens when present. Do not sum snapshots
within a resumed logical session.

For cross-thread duration, tool-call, and token summaries, show the total plus
mean, median, minimum, maximum, and an explicit `recorded/total sessions`
denominator. Exclude missing values from the calculation rather than treating
them as zero. Label duration as **recorded elapsed time**; parallel durations
overlap and their sum is not mission wall-clock time. Label token totals as
**detected related-session tokens** and retain the bounded-root/whole-child caveat
when the extraction window differs between parent and child sessions.

Also show attributed token totals grouped by model, with session count and the
recorded effort variants. Model names and effort come from actual
`turn_context` records; do not infer them from delegation prompts. Keep this
breakdown distinct from pricing or account-wide usage.

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
