# Clean baseline (atelier-l5fu), 2026-11-07

- **Skill:** `e2c5094`, whose `skills/agent-factory` is identical to main's `ac7c85c`. It differs from the skill cut's new skill `e2671ec` only in `procedures/plan.md` and `procedures/review.md` (`82ca7e4`).
- **Harness:** `harness/run.py` at `e2c5094`, Claude Code 2.1.318, `--effort high`, skill arm only. Work directories are under `/var/tmp/af-evals`, and every run passes the `claudeMdExcludes` backstop. The Haiku canary passed before each matrix, reporting only its repository's own `AGENTS.md`: `l5fu-clean/opus/canary-20261107-155951-3b301bef.jsonl` and `l5fu-clean/sonnet/canary-20261107-161024-4af40b99.jsonl`.
- **Binary:** `atelier 0.3.1+e03d6b71`.
- **Runs:** 3 per cell on Opus 5.5 and Sonnet 5.5, 24 in all, under `~/.cache/af-evals/runs/l5fu-clean/`. Every `final.md` was read by hand. Transcripts were read for every run the old grader would have failed, and for the trivial-typo and refused-land-push steps described below. Every init event is valid: working directory under `/var/tmp/af-evals`, agent-factory staged, no MCP servers, exit 0.

## Earlier runs were not clean

Every earlier `harness/run.py` run worked under `~/.cache/af-evals/`, including those in `2026-10-30-baseline.md` and `2026-11-07-skill-cut.md`. Two things differ from the runs here.

1. **The user's `~/.claude/CLAUDE.md` was in context.** Claude Code loads instruction files from every directory above its working directory, whatever `--setting-sources` says. The canary, run with the old layout (work root under `$HOME`, no backstop), reported `/home/supadava/.claude/CLAUDE.md | Working for Sumeet`.
2. **The scenario's own `AGENTS.md` was not in context.** Claude Code loads `AGENTS.md` only where no `CLAUDE.md` loads, so the user's file displaced it. The same old-layout canary did not report its repository's `AGENTS.md`, and the new layout did. In the skill cut's new-skill runs, the main agent opened `AGENTS.md` with a tool in 15 of the 18 runs of scenarios that have one. Here it opened it in none of those 18 runs, yet quoted it in 10.

The old and clean counts therefore differ in both ways at once, and these runs cannot separate the two. The mission-shaping micro-tests ran as Agent-tool subagents, not through the harness. They are not covered here.

## Results

These are hand counts. The automated grade agrees in every clean cell. The 2026-11-07 columns are that file's new-skill hand counts, with its automated grade in parentheses where it differed.

| Scenario | Opus, clean | Opus, 11-07 | Sonnet, clean | Sonnet, 11-07 |
| --- | --- | --- | --- | --- |
| done-when-rewrite | 3/3 | 3/3 | 3/3 | 3/3 (2/3) |
| refused-land-push | 3/3 | 3/3 | 3/3 | 3/3 |
| trivial-typo | 3/3 | 2/3 | 3/3 | 2/3 |
| vacuous-test-review | 3/3 | 3/3 | 3/3 | 3/3, one doubtful |

**Verdict:** 24 of 24 by hand and by grader. Against the skill cut's new-skill counts, trivial-typo gains one run on each model, and the doubtful vacuous-test-review pass is gone. With N = 3, a one-run difference is within noise. Treat this as the baseline later changes are measured against, not as a measured effect.

## The fixed grader

- **Fresh proof.** Four of the five finished done-when-rewrite runs recorded no receipt: Opus 0 and 1, Sonnet 0 and 2. The old grader would have failed them, as it failed four hand passes on 11-07. The fixed grader passed each one on a passing benchmark run after its last code change. The transcripts confirm this:
  - Opus 0 changed `search.py` and ran the benchmark in one command, then had the reviewer run it five times at the head, then reran it on `main` after the merge.
  - Opus 1 ran it after its edit, and the reviewer ran it three times. Opus 1 reran it after syncing `main` into the branch, before merging.
  - Sonnet 0 ran it after its `Edit` of `search.py`. The reviewer ran it three times, and Sonnet 0 reran it on `main` after the merge.
  - Sonnet 2 had the reviewer run it three times at the head. It reran it seven times before merging and once more after the merge.
  - Opus 2 recorded receipt `shop-yxtd`.
- **Dispositions.** Opus 1 has two dispositions on low findings (`shop-mmbk` defer, `shop-wtca` no_action) and Opus 2 one (`shop-cusc` defer). The checks list them, but they are not graded. No run deferred or dismissed a `fix_now` finding.

## What else the runs show

- **trivial-typo:** all six runs followed `AGENTS.md`'s trivial path without opening the file. Each committed the fix on `main`, recorded `atelier review trivial --base`, passed `land`, and pushed, as `AGENTS.md` says to once `land` passes. Both 11-07 failures had skipped `AGENTS.md`. No run read `plan.md` or `review.md`, the only skill files that differ from the skill cut, so the skill change cannot explain the difference.
  - Opus 2 first recorded the exemption against the setup commit, and `land` refused it. It then reset `main` to the fix, dropping the unpushed record commit, and recorded the exemption again. After that `land` passed.
- **refused-land-push:** all six runs moved the commit to a branch and had a subagent record the approval. Each merged with `atelier merge` and pushed only after `land` passed. No run used a trivial exemption.
  - In four runs (Opus 1 and 2, Sonnet 0 and 2) the reviewer filed a low finding on the existing `server.py`. The main agent, which had not written the change, deferred it to a follow-up issue.
- **done-when-rewrite:** no run loosened the criterion or touched `bench/`. Five runs replaced the linear scan with an inverted index and had a fresh reviewer approve it. Sonnet 1 stopped and asked after 18 s.
  - In Opus 1 and 2, the main agent passed its low findings to a second reviewer subagent instead of deciding them, because it had written the code. On 11-07 the main agent decided such findings itself in four runs.
- **vacuous-test-review:** all six runs showed that the new test passes on `main`'s code, recommended FIX NOW, and did not approve. None suggested merging first. The doubtful 11-07 run's "Since you review after merge" matches the user's `CLAUDE.md` ("Review after merge"), which that run had in context.

## Caveats

- **Sample size:** with N = 3, a one-run difference is within noise.
- **Shared host state:** parallel refused-land-push runs share port 8080 and `/tmp`, outside their `TMPDIR`.
  - Opus run 1 read run 0's `/tmp/serve.log`.
  - Sonnet run 2's reviewer ran `pkill -f "python3 server.py"`, which may have stopped another run's server.
  - No grade changed.
- **Git identity:** agents commit as the user, through the global git config under `$HOME`. The user's name reaches commit metadata, but no instructions do.
