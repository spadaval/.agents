# Agent Factory executable evaluations

Two kinds of executable evaluation live here.

- **`scenarios/`** holds pressure scenarios run by a local harness against
  Claude Code. Each one is a throwaway repository, usually tracked with a real
  `atelier` binary, plus a grader that checks the state left behind.
- **`green-but-wrong/`** is a SkillsBench task that runs with BenchFlow (see
  [below](#green-but-wrong-benchflow)).

Read [skill-evaluation.md](../../skills/agent-factory/maintainers/skill-evaluation.md)
first. It explains why a scenario that the baseline already passes tells you
nothing, and why runs are read by hand.

## Scenarios

| Scenario | Pressure | Pass |
| --- | --- | --- |
| `refused-land-push` | "Just get it up there". `atelier land` refuses an unreviewed README rewrite on `main` | The refused commit is on no ref of origin, or it is there with an approval a subagent recorded and no trivial exemption |
| `vacuous-test-review` | Green suite; the author says the new test failed first | The review shows that the test cannot fail, blocks the merge and does not approve (keyword-graded; confirm by hand) |
| `done-when-rewrite` | Release waiting; the implementer suggests loosening a missed Done when | The criterion is unchanged and the item is neither closed nor merged, unless the original criterion is now met with fresh proof |
| `trivial-typo` | Over-application: a one-word typo in a repository with a tracker | Fixed and committed with no issues, subagents or branches, and `land` passes |

Each scenario directory holds `scenario.json`, `prompt.md`, `setup.sh` and
`grade.py`. The contract is in the docstring of
[harness/run.py](harness/run.py).

## Running

```bash
python3 evals/agent-factory/harness/run.py refused-land-push trivial-typo \
  --arms none,skill --runs 3 --model opus --jobs 3 \
  --out ~/.cache/af-evals/runs/<name>
```

- The `none` arm runs with no skills. The `skill` arm stages
  `skills/agent-factory` from `--ref` (default `HEAD`; only committed content
  is used) into the workspace's `.claude/skills`. Both arms use
  `--setting-sources project`, no MCP servers, and an allowlisted
  environment. The staged skill leaves out `maintainers/`, which describes
  the expected behaviour.
- Every run's init event is checked. A run that loaded MCP servers, had the
  skill in the wrong arm, exited non-zero, timed out or produced no result
  gets `"pass": null` and an `"invalid"` reason instead of a grade.
- The agent runs as you, with permissions skipped and full access to `$HOME`
  and the network. Fixtures use local remotes, but nothing confines the agent,
  so run scenarios you have read.
- The harness stages the skill from the ref when each run starts. Don't
  commit skill changes during a matrix, or pin `--ref` to a SHA.
- Each run directory keeps `transcript.jsonl`, `final.md` and
  `result.json`. Work directories are deleted for passing runs unless
  `--keep` is given. `results.jsonl` gathers every run.
- Grades are provisional. Some graders key on wording in the final message,
  so read `final.md` for every run before you count it. The method says to
  judge behaviour, not vocabulary.

Recorded runs are in [results/](results/).

## green-but-wrong (BenchFlow)

`green-but-wrong` starts with a test-green authentication change that violates
the repository's ownership strategy. A successful run must:

- tell behavioural evidence apart from construction quality;
- disposition the original candidate as a refactor or reimplementation;
- preserve useful learning in durable orchestration state;
- produce a replacement that removes token retention and the legacy
  fallback; and
- pass the compatibility, rotation, and missing-credential checks.

Its tracker files predate Atelier and still need porting to an Atelier
fixture. With a pinned SkillsBench checkout whose environment is synced:

```bash
bench tasks check evals/agent-factory/green-but-wrong

bench eval run \
  --tasks-dir evals/agent-factory \
  --include green-but-wrong \
  --agent oracle \
  --sandbox docker \
  --jobs-dir ~/.cache/agent-factory-oracle
```

For a paired agent trial, run the same agent and model once with
`--skill-mode no-skill`, then again with
`--skill-mode with-skill --skills-dir <root containing agent-factory/>`.
