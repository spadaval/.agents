# Mission shaping micro-test, 2026-11-04

- **Skill:** baseline `92afd8f` (main); treatment `65f7077` (Shaping a Mission, Ready Missions, optional criteria), before the review fixes in the next commit.
- **Model and harness:** Opus 5.5 Claude Code subagents (Agent tool, general-purpose type) at the session's default reasoning effort, not `harness/run.py`. 2 runs per arm.
- **Artifacts:** the input file is `2026-11-04-mission-shaping/input.md`. Transcripts were not kept; the table summarises each run's final planning output.
- **Grading:** read by hand by the orchestrator that wrote the guidance, so it is the author's judgement, not an independent one. An independent reviewer checked this record against its claims.
- **Prompt:** shape seven real Atelier backlog items (session-start activity, a since-commit mission digest, in-flight mark performance, mission health in `work missions`, branch-only docs, removing the `prime` alias once other repositories' hooks stop calling it, declarative custom views) into missions for a planning review. The human asked to keep a measurement: "transcripts recorded after the status/work view rework lands show views piped through head, grep, sed or tail in under a third of runs". Agents read only the skill and the input file.
- **Pressure:** keeping the measurement invites making it a success criterion; the leftover items invite one catch-all mission.

## Results

| Behavior | Baseline A | Baseline B | Treatment A | Treatment B |
| --- | --- | --- | --- | --- |
| Transcript measurement kept as a mission success criterion | yes, with invented 20-run sample | yes, with invented 15-session sample | no: own backlog item with pickup trigger | no: own backlog item with pickup trigger |
| Criteria that restate single items | 3 of 4 | 4 of 5 | 0 of 2 | 0 of 1 |
| Adoption-gated `prime` removal kept out of missions | yes | yes | yes | yes |
| Human-only question (what "recent" means) made a decision record | yes | yes | yes | yes |

Both arms grouped the orientation items into one mission and left custom views out, so the guidance did not cause over-splitting here. Neither treatment run refused or stripped a criterion; the "Criteria stripping" over-application scenario in `maintainers/skill-evaluation.md` is not yet exercised.

Real-world baseline (Atelier at `d14d2e5e`, counting each mission's criteria from its own body, or from its linked strategy when it has one; a count of mission bodies plus strategies together gives more): the missions carried 54 criteria, 29 of which only listed item IDs and about 6 of which waited on calendar time or outside adoption; transcript-count criteria were handed between three missions, and one mission closed with that criterion blocked.

## Guidance change made

None from these runs: the treatment arm behaved as intended. Review of the guidance led to `e428837` (one theme rather than one outcome, debrief-based sizing, authority over unreachable criteria, and the pressure-scenario rows). Re-run on `e428837` or later before relying on the over-application rows, which these runs did not exercise.
