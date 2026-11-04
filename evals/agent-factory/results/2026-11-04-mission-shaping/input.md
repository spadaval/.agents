# Backlog items to plan

These items are open in an Atelier repository (a Rust CLI tracker). A previous planning pass left them unassigned. Also, the previous mission's planner wanted this measurement kept somewhere: 'Claude Code transcripts recorded after the status/work view rework lands show status and work views piped through head, grep, sed or tail in under a third of runs' (the before-measure was about four runs in five).

## atelier-majk: Show recent tracker activity at session start

## Goal

A fresh session has no summary of what closed, merged, or changed in the tracker recently and reconstructs it from `git log`.

## Done when

`status` shows a short recent-activity section derived from Git (items closed, merged owners, new findings since a reference point), at most 8 lines. The reference point is fixed when this leaves backlog.

## Unknowns

What "recent" means without session records (ADR 0014/0019): the last N base commits, the upstream, or a time window.

## atelier-avx0: Add a since-commit digest of a mission for orchestrator wake-ups

## Goal

o3lm had 75 subagent-completion wake-ups and each re-read a ~400k-token context; the adoption run's main thread re-read 0.5-1M tokens on about 1,500 turns (about 1.4B cache-read tokens), the largest single line of spend.

## Done when

`atelier work mission <id> --since <commit>` prints only what changed: items started, closed, reviewed, merged, new findings and follow-ups, and what is next. The Agent Factory skill tells orchestrators to use it and to ask subagents for short reports. A rendering test covers it.

## Context

Found in the 2026-10-17 retrospective of the 10-15..10-17 atelier runs (sessions b32c39e6, 9a04974d, d483b55c, bf433168).

## atelier-3i7x: Compute in-flight marks without snapshotting each branch's tracker

## Goal

`work ready`, `work all` and `status` read every local work branch through `Snapshot::at` (`git archive | tar` of the whole `.atelier` tree, load, policy validation, review scope). Measured in review of atelier-7n5u: about 80-100 ms per owned branch on a release build (0.75 s for `work ready` with 7 branches vs 0.04 s for `work blocked`), so cost grows with branches times tracker size. The in-flight marks need only the owner record blob and `done_merged`.

## Done when

In-flight marks come from the owner record blob without a full snapshot, and the snapshot-only facts (such as the active count in the Other local work branches section) are computed only when that section is shown. `work ready` with 7 owned branches on a release build stays within 2x of `work blocked`, shown by a timing recorded as evidence, and existing tests pass.

## Context

`crates/atelier-cli/src/commands/git.rs` `branch_summaries` (after atelier-7n5u). SessionStart runs `status`, so this also bounds hook latency.

## atelier-jbwi: Show planned versus built work and backlog health in work missions

## Goal

About 85 of the 99 CLI-audit issues sit untouched in five draft missions, the backlog grows with every review pass, and the user believed brief/debrief had shipped when it was still a draft mission (33405776).

## Done when

`atelier work missions` shows per mission how much is done, active and not started, flags draft missions with no started work, and counts backlog items older than a configurable age. Rendering tests cover it.

## Context

Found in the 2026-10-17 retrospective of the 10-15..10-17 atelier runs (sessions b32c39e6, 9a04974d, d483b55c, bf433168).

## atelier-kglz: Show docs that exist only on unmerged branches

## Goal

'Where is ADR 22? I don't see it in the main tree' — it was on a review branch (872b89d8). Plans under review are invisible from the base checkout.

## Done when

`atelier status` and `work mission` list ADRs, strategies and product docs added on local owner branches but absent from the base, with the branch and its review state. A test covers it.

## Context

Found in the 2026-10-17 retrospective of the 10-15..10-17 atelier runs (sessions b32c39e6, 9a04974d, d483b55c, bf433168).

## atelier-jjvc: Remove the deprecated prime alias

## Goal

ADR 0022 keeps `prime` as an alias for `status` so adopters' installed SessionStart hooks keep working. Remove it once known adopters' hooks no longer call it.

## Done when

`atelier prime` is gone from the CLI and help, `atelier check` or `land` names a `.claude/settings.json` hook that still calls `prime --hook claude` with the fix (`atelier setup claude`), and the CHANGELOG records the removal. Plan this into `todo` when neither this repository's nor astromech's committed `.claude/settings.json` contains `prime --hook claude`; the project makes no numbered releases.

## Context

ADR 0022 Decision 1; review finding atelier-1ia7 on atelier-bw0b.


## atelier-e95f: Let repositories define custom work views declaratively

## Goal

Let a repository define its own work views as committed, declarative definitions, so an orchestrator can see items sliced by the fields and filters its project or role needs (project labels, configured statuses, a reviewer's columns, one mission's land-related items) without scripting around Atelier's output.

## Done when

A design is accepted (an ADR, since it qualifies ADR 0022 Decision 4) and then built, so that:
- View definitions live in `.atelier/`, are validated by `atelier check`, and are reviewed like other records.
- A definition may only filter, choose fields from a fixed vocabulary, sort (using the shared order), and group. It cannot redefine derived states (ready, blocked, evidence freshness, merge readiness); those always come from core, so a view never contradicts a gate.
- Definitions render through the same item-line contract and renderer as built-in views, so output stays dense Markdown. No scripts and no machine format.
- Built-in views such as `work ready` and `work mission` are expressed in the same format.

## Scope

Declarative configuration only. Runtime code, scripting hooks, and JSON or YAML output are out of scope.

## Context

From discussion with Sumeet on 2026-10-17 about "code mode" interfaces. The questions an orchestrator asks (what is ready, what holds it up, what needs a human) are universal, and wanting a custom view for one of them means the built-in view is incomplete: file that defect, per ADR 0022 Decision 4. How the data is sliced is not universal, and building every slice in would bloat the views. A committed custom view is itself a signal: if many repos define the same one, promote it to built-in.

Blocked by atelier-i2qq, which writes the shared item-line contract this format depends on. Defining views before that contract exists would freeze today's inconsistent views into a public format.

## Unknowns

- Whether definitions belong in `.atelier/config.toml` or in their own records.
- The field vocabulary, and how a view names a mission or a parent.

