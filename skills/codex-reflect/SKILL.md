---
name: codex-reflect
description: Build evidence-backed retrospectives from prior Codex sessions and ~/.codex logs. Use when the user asks what went well or poorly in an earlier run, how an agent handled failures, where time or tokens went, whether delegation helped, or what to improve in code, tooling, guidance, skills, or workflow.
---

# Codex Reflect

Use actual artifacts from `~/.codex`; treat memory only as a hypothesis to
verify.

## Default Procedure

1. Locate the relevant transcript, then resolve its lineage to the root
   session before selecting the primary analysis target.
2. Bound the root analysis window when it spans multiple tasks.
3. Build the Markdown analysis pack with `--session`.
4. Read the generated `index.md`, then assign bounded review slices from the
   pack when the analysis is large.
5. Verify raw JSONL only around relevant failures, gaps, delegation, handoff,
   and final claims.
6. Synthesize a STAR-I retrospective that preserves effective behavior and
   identifies concrete improvements. For multi-agent work, use a root-level
   STAR-I with bounded workstream cards rather than a linear child-by-child
   narrative.

Read [references/metrics.md](references/metrics.md) before reporting tokens,
counts, duration, tool metrics, or detected linked-session totals. Read
[references/output-formats.md](references/output-formats.md) before composing
any user-facing analysis.

## Analysis Pack

Run:

```bash
python3 /root/.codex/skills/codex-reflect/scripts/summarize_codex_run.py --session <id-or-path>
```

The command writes an owner-only Markdown pack under
`${CODEX_HOME:-~/.codex}/tmp/codex-reflect/` and prints the path to `index.md`.
It contains a run overview, parent-session brief, failure review,
timeline, delegation evidence, metrics, and one brief for each available
detected linked session. Raw rollout JSONL remains authoritative.

Use `--output-dir <new-path>` only when the pack must live elsewhere. Use
`--json` only for debugging or external interoperability, never as the default
agent-reading path.

## Find a Session

The user may identify a run by topic or project; do not require an exact
session ID.

```bash
python3 /root/.codex/skills/codex-reflect/scripts/summarize_codex_run.py --projects
python3 /root/.codex/skills/codex-reflect/scripts/summarize_codex_run.py --list --project /root/atelier --recent 20
python3 /root/.codex/skills/codex-reflect/scripts/summarize_codex_run.py --find "postmortem" --project /root/atelier --recent 20
```

`--projects` lists known transcript working directories with session counts and
latest activity. `--project` filters `--list` and `--find` by the exact,
normalized session working directory before applying `--recent`.

## Resolve Session Lineage

Do not choose a primary run from its title or recency alone. Before analyzing a
candidate transcript, inspect it for a `<codex_delegation>` block with a
`source_thread_id`. If present, resolve that source session and repeat until a
session has no upstream source thread. Analyze that root session by default.

Use `create_thread` outputs and `subagent_notification` events in the root
transcript to identify child mission, worker, review, and validation sessions.
Build a child pack only for a focused slice; do not substitute it for the root
retrospective. State explicitly when a requested question is only about a
particular child session.

## Choose the Review Slice

| Question | Pack artifact | Verify |
| --- | --- | --- |
| What happened and what should change? | `parent-session.md` | Final claim, patches, and validation |
| Did the agent handle failures well? | `failures.md` | Tool output and adjacent raw events |
| Where did time go? | `timeline.md` | Phase boundaries and long gaps |
| Did delegation help? | `delegation.md`, `sessions/` | Parent delegation and child handoff |
| How much did the work cost? | `metrics.md` | Window and linked-session caveats |

Search `~/.codex/session_index.jsonl` for thread metadata and
`~/.codex/history.jsonl` for prompt text. Search recent rollout transcripts in
`~/.codex/sessions/YYYY/MM/DD/` before `~/.codex/archived_sessions/`. Check
`~/.codex/shell_snapshots/` only when shell state matters. Treat
`~/.codex/logs_*.sqlite` as diagnostics, not the primary transcript.

## Evidence and Caveats

- Treat detected linked sessions as candidates, not proven subagents. Verify
  delegation and handoff events before claiming a mission-wide total.
- Treat `source_thread_id` in `<codex_delegation>` as an upstream lineage link,
  not merely another detected session reference.
- An event window and a long event gap show logged elapsed time, not proven
  active work or idleness.
- Failure-response context records adjacent messages and follow-up actions; use
  it as evidence for diagnosis quality or confusion, not as an automatic
  conclusion about either.
- Changed paths come only from `patch_apply_end` events; do not claim a full
  worktree diff from them.

## Delegating a Large Retrospective

Delegate only bounded artifact review or counting to `gpt-5.6-luna` at `low`
reasoning effort. Give each subagent one pack artifact and a narrow question,
for example “separate real failures from noise in `failures.md`.” Require
timestamps and evidence in its handoff. Keep correlation, causal analysis, and
final synthesis with the primary agent.
