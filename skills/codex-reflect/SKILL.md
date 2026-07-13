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
3. Extract a temporary evidence workspace with `extract_evidence.py`, then
   create its centralized Artifact Hub app with `create_report_app.py`.
4. Read the generated `markdown/index.md` and the relevant evidence briefs
   directly. The Svelte viewer is for human exploration, not the agent's
   primary analysis surface.
5. Verify raw JSONL only around relevant failures, gaps, delegation, handoff,
   and final claims.
6. Author `<artifact>/src/report/report.ts` from the evidence pack. Identify the
   actual task, lifecycle, outcome, phases, actions, workstream roles, and
   cross-thread findings; cite normalized evidence IDs for every substantive
   conclusion. Do not ask the viewer to infer these semantics from labels or
   keywords.
7. Validate with Artifact Hub's shared toolchain, then inspect the live report
   at desktop and narrow widths.
8. Synthesize a STAR-I retrospective that preserves effective behavior and
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
python3 /root/.agents/skills/codex-reflect/scripts/extract_evidence.py --session <id-or-path> --output-dir <new-workspace>
python3 /root/.agents/skills/codex-reflect/scripts/create_report_app.py <new-workspace> \
  --id reflect-<descriptive-id> --consume
```

The first command writes an owner-only temporary evidence workspace and prints
the path to `index.md`. The second copies that evidence and the specialized
template into `~/.agents/artifacts/<artifact-id>/`, then removes the temporary
workspace when `--consume` is used.
It first merges every rollout file whose metadata has the same session ID, so
resumed transcripts form one logical-session pack. Its structure is:

```text
~/.agents/artifacts/<artifact-id>/
├── manifest.json         # minimal Artifact Hub catalog metadata
├── index.html            # complete app entry point
├── evidence/             # helper-owned normalized facts and source excerpts
├── markdown/             # helper-owned agent-readable briefs; start at index.md
└── src/
    ├── platform/         # report UI and provenance behavior
    └── report/           # artifact-local typed analysis
```

`extract_evidence.py` has no Node dependency: it produces the immutable pack
for agent reasoning. `create_report_app.py` requires the embedded template and
Artifact Hub CLI. It does not create a package, dependency installation, Vite
configuration, PID, log, or private server. Validate and open the artifact with:

```bash
cd ~/.agents/artifacts/<artifact-id>
/root/.agents/node_modules/.bin/vite-node scripts/validate-report.ts
/root/.agents/node_modules/.bin/vitest run --config /root/.agents/vitest.config.ts --root .
/root/.agents/node_modules/.bin/svelte-check --tsconfig ./tsconfig.json
/root/.agents/bin/artifact-hub open <artifact-id>
```

Artifact Hub owns the one Vite server and binds it to `0.0.0.0` for the trusted
internal network. It provides no authentication or TLS. To identify the source
IP chosen for the default outbound route, run:

```bash
ip route get 1.1.1.1 | awk '{for (i = 1; i <= NF; i++) if ($i == "src") { print $(i + 1); exit }}'
```

Use that address, or the host name from SSH configuration, when setting up an
SSH tunnel. If no default route is available, inspect the host's addresses with
`ip -br addr` or `hostname -I`; choose an address reachable from the SSH
client.

The standard viewer is an analyzed, workstream-centered postmortem. It leads
with the agent-authored task and outcome, then presents one chronological
Activity stream. Optional phase bands mark sustained segments; authored actions
and unphased activity remain in chronological position, and cited or otherwise
recorded raw events expand in place. Do not add a second raw appendix.
Delegation actions navigate to child workstreams; child pages include full
delegation-only ancestor breadcrumbs. Thread creation is not delegation:
created or forked threads are related peers, shown as chronological top-level
roots rather than ancestors. The shared shell provides a collapsible report
rail with related threads and their workstream trees, plus a separate deep-linked cross-thread analysis page for the outcome
matrix, resource distribution, common failures, and delegation effectiveness.
Resource distribution includes attributed tokens by actual
model so delegation choices remain visible; individual workstream pages show
their recorded model and reasoning effort, with configuration history disclosed
when it changed. Workstream pages remain scoped to their own task, outcome,
resources, Activity, and provenance.

Keep report typography compact and content-led: page titles orient the reader
but must not dominate the task, assessment, or activity. Session identity and
reliable starting Git context belong directly under the title. The resource
strip shows elapsed time, tool calls, recorded changed-file count, and model;
token dimensions remain in one expandable breakdown.

Activity disclosures summarize useful deterministic counts before expansion
(commands, unique changed files, failures, messages, and high-confidence Git
commits). Group consecutive commands and file edits, use time relative to the
session start, and distinguish event types without turning every record into a
card. Raw rows remain collapsed by default. Do not link an action back to the
session already being read or surface bare citation IDs as summary badges.

Do not add generic per-session “Git context” or cross-thread “Git flow”
sections. Show the recorded initial `branch @ short-sha` as quiet identity
context and place reliable successful commits in chronological activity. A
branch-flow visualization requires structured repository identity, source and
target refs, resulting commit, and operation-specific timestamps; omit it when
the extractor has only regex-derived command evidence.
Stable source IDs remain available through deep links, and legacy evidence
hashes redirect to the owning workstream. Do not use `vite build` as part of
normal analysis; archival builds are intentionally out of scope.

For a full multi-agent mission, use the root session with `--workstream`:

```bash
python3 /root/.agents/skills/codex-reflect/scripts/extract_evidence.py --workstream <root-id-or-path> --output-dir <new-workspace>
```

This discovers peer threads through `create_thread`, `fork_thread`, and source
thread provenance, then follows actual subagent spawns within each thread.
Thread relations remain directional provenance but never become workstream
ancestry. The authored analysis selects the primary thread; other discovered
threads remain chronological peers. The helper also adds `workstreams.md` and
`workstream-metrics.md` under `markdown/`.

Use `--output-dir <new-path>` only when the pack must live elsewhere. Use
`--json` only for debugging or external interoperability, never as the default
agent-reading path.

## Author the report

The normalized evidence API is immutable provenance. The TypeScript modules in
`src/report/` are deliberately artifact-local and agent-authored. Keep
deterministic facts such as timestamps, counts, token snapshots, tool results,
and observed Git operations in evidence; use the authored report to interpret
what task was attempted, what mattered, and whether it succeeded.

Use the exported report types rather than inventing an unvalidated JSON shape.
Keep lifecycle (`completed`, `active`, `aborted`, `unknown`) separate from
outcome (`succeeded`, `partial`, `failed`, `blocked`, `unknown`). Reserve
`blocked` for a workstream that could not proceed because it needed external
input, authority, infrastructure, or another dependency. A completed review or
validation that found defects has lifecycle `completed` and outcome `failed`.

Use phases only for coherent, sustained segments of the chronology. A useful
phase normally contains at least three meaningful events or actions; do not
invent tiny one- or two-event phases solely to classify activity. Phases are
optional and do not need to cover the whole run. Unphased actions and events
remain first-class chronological entries between phase bands. Give every
authored action explicit chronological start/end bounds: the viewer uses that
range to group all normalized events the action explains, while citations mark
the strongest supporting events inside the range. Substantive child sessions
normally need 3–8 meaningful actions; long primary sessions need more. Do not
collapse an entire session into one generic action, and do not reproduce every
tool call in prose. Events outside authored action ranges remain compact,
chronological entries in place—never one giant catch-all bucket. Actions may
span multiple sessions when the analysis genuinely requires it. Include a
complete workstream entry for every detected logical session, even when the
honest assessment is `unknown`.

For multi-agent packs, adapt analysis delegation to the evidence size:

- Up to 3 sessions: the primary analyst works alone.
- 4 or more sessions: partition lineage branches among bounded analysts.
- 8 or more sessions, or at least 25 failure signals: reserve an analyst for
  cross-thread failure and delegation review.
- The primary analyst always reconciles conflicting handoffs, owns the root
  task and overall outcome, and writes the final `RunAnalysis`.

Custom report-local Svelte components may be registered only through the typed
root, workstream, and cross-thread section slots. They may augment the report;
they must not replace shared routing, navigation, source drawers, or provenance
behavior. Change the master template for reusable platform behavior, but keep
run-specific analysis and visualization in the generated app.

## Find a Session

The user may identify a run by topic or project; do not require an exact
session ID.

```bash
python3 /root/.agents/skills/codex-reflect/scripts/discover_sessions.py --projects
python3 /root/.agents/skills/codex-reflect/scripts/discover_sessions.py --list --project /root/atelier --recent 20
python3 /root/.agents/skills/codex-reflect/scripts/discover_sessions.py --find "postmortem" --project /root/atelier --recent 20
```

`--projects` lists known transcript working directories with session counts and
latest activity. `--project` filters `--list` and `--find` by the exact,
normalized session working directory before applying `--recent`.

## Resolve Related Threads and Delegation

Do not choose a primary run from its title or recency alone. Before analyzing a
candidate transcript, inspect it for a `<codex_delegation>` block with a
`source_thread_id`. If present, follow it to discover the related thread graph;
do not treat it as parent/child ancestry. Select the primary thread from the
requested task and evidence, then analyze subagent delegation beneath each
thread separately.
For a multi-agent review, prefer `--workstream <candidate>` rather than a
single-session pack: it performs this root resolution and follows recorded
downstream links.

Use `create_thread` and `fork_thread` outputs to find peer threads. Use
`spawn_agent` outputs and `subagent_notification` events to identify child
worker, review, and validation workstreams.
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

- Schema-v5 packs retain all normalized user/agent messages and paired tool
  invocations/results. Derived failures, patches, validations, and Git
  observations point back to their owning tool interaction; avoid presenting
  both as independent actions.
- Git evidence describes only initial transcript metadata and operations visible
  in captured commands or outputs. Never query the repository's present state
  and present it as the session's historical branch or commit state.
- Treat detected linked sessions as candidates, not proven subagents. Verify
  delegation and handoff events before claiming a mission-wide total.
- Treat `source_thread_id` in `<codex_delegation>` as a directional peer-thread
  discovery link, never as workstream ancestry.
- An event window and a long event gap show logged elapsed time, not proven
  active work or idleness.
- Failure-response context records adjacent messages and follow-up actions; use
  it as evidence for diagnosis quality or confusion, not as an automatic
  conclusion about either.
- Changed paths come only from `patch_apply_end` events; do not claim a full
  worktree diff from them.

## Delegating a Large Retrospective

Delegate bounded lineage branches or one cross-thread concern. Give each
analyst exact session IDs and pack artifacts, require evidence IDs and explicit
uncertainty, and prohibit editing the shared report module. Workstream analysts
return candidate typed content to the primary analyst; they do not independently
decide the root outcome. Keep reconciliation, causal analysis, metric caveats,
and final report assembly with the primary agent.
