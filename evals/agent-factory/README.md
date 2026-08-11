# Agent Factory executable evaluations

These tasks use the SkillsBench task format and run with BenchFlow. They are
real repository fixtures with deterministic verifiers, not prompt-only thought
exercises.

`green-but-wrong` starts with a test-green authentication change that violates
the repository's ownership strategy. A successful run must:

- distinguish behavioral evidence from construction quality;
- disposition the original candidate as a refactor or reimplementation;
- preserve useful learning in durable orchestration state;
- produce a replacement that removes token retention and legacy fallback; and
- pass compatibility, rotation, and missing-credential checks.

## Minimal procedure

With a pinned SkillsBench checkout whose environment is synced:

```bash
bench tasks check /root/.agents/evals/agent-factory/green-but-wrong

bench eval run \
  --tasks-dir /root/.agents/evals/agent-factory \
  --include green-but-wrong \
  --agent oracle \
  --sandbox docker \
  --jobs-dir /tmp/agent-factory-oracle
```

For a paired agent trial, run the same agent and model once with
`--skill-mode no-skill`, then again with:

```bash
--skill-mode with-skill --skills-dir /path/to/root-containing-agent-factory
```

The skills directory must contain `agent-factory/SKILL.md` as an immediate
child. Stage the current skill into a temporary root so the trial evaluates the
working copy without injecting unrelated skills. Keep each arm's jobs directory
separate, compare verifier rewards, and inspect the ACP trajectories before
drawing conclusions.

One successful task is a smoke test, not evidence of general skill efficacy.
Add scenarios that vary the candidate disposition, ambiguity, and cost of
experimentation before treating score differences as meaningful.
