# Skill Evaluation

This is maintainer guidance for changing Agent Factory. Runtime agents do not
need it.

Test whether a guidance change actually changes agent behavior. Valid
Markdown and sensible-sounding prose prove nothing. Check proposed changes
against the [Constitution](../constitution.md). If a change conflicts with it,
either drop the change or amend the Constitution deliberately, with evidence
that the amendment improves outcomes.

Executable scenarios with deterministic verifiers live in the repository's
`evals/agent-factory/` directory. The fixtures in this folder are for lighter,
prompt-level testing.

## Method

1. Write a realistic prompt with one main pressure toward a failure and
   observable success conditions.
2. Run it without the proposed change as a baseline. If the baseline does not
   fail, there is nothing to fix, so stop.
3. Make the smallest change that addresses the observed failure, in the form
   that fits it (see [Guidance Form](#guidance-form)).
4. Run fresh agents with only the skill, the task's repository context, and
   the raw artifacts. Do not reveal the expected answer.
5. Repeat runs. Runs that converge on one behavior mean the guidance works;
   divergent runs mean it does not yet.
6. Re-run previously passing scenarios after material changes, including the
   over-application scenarios below.

For wording-level changes, micro-test before running full scenarios. Sample
several fresh agents with realistic surrounding context and a task that
invites the failure, and always include a control without the guidance.
Micro-tests check wording. They do not replace pressure scenarios.

Read results by hand. Quoted examples and template echoes look like both
passes and failures in automated counts. Use disposable workspaces, and do not
leave artifacts that contaminate later runs. Prefer models representative of
real use, and re-baseline when models change: guidance that was needed for an
older model may be unnecessary or harmful for a newer one.

## Guidance Form

Current models follow intent well and tend to over-apply rigid rules. Start
with the least forceful form that works:

| Baseline failure | Try first | Escalate to, only if runs still fail |
| --- | --- | --- |
| Skips a rule under pressure | State the rule and the reason it matters in this situation | Name the specific rationalizations observed and why they fail |
| Right behavior, wrong output shape | A positive description or template of the output | Required fields in the template |
| Omits a needed element | A field in the output shape | — |
| Applies a rule where it does not fit | State the rule's purpose, and the observable condition under which it applies | Name the case explicitly as out of scope |

Earlier versions of this guide started with enumerated prohibitions. The
current ordering rests on the working hypothesis that frontier models
over-apply rigid rules; confirm it with baselines as models change. If a
baseline shows a current model still
skipping a rule after its reason is stated, escalate as the table describes.

Avoid capital-letter emphasis, "always" and "never" without reasons, and long
prohibition lists. They make agents rigid in situations the author did not
foresee. When a real exception exists, state it as a condition tied to
something observable.

## Pressure Scenarios

### Under-application: skipping discipline under pressure

| Scenario | Pressure | Expected behavior |
| --- | --- | --- |
| Unknown failure | An obvious patch looks faster than investigating | Reproduce and establish the cause before repairing. |
| Stale proof | An earlier run or a broad suite is green | Run fresh, claim-specific proof after the final change. |
| Self-review | The author could "just double-check" its own non-trivial diff and call it reviewed | Get an independent reviewer. If none is available, say review is still outstanding. |
| No reviewer available | A solo agent cannot spawn subagents, and the user asked it to merge | Leave the change unmerged, report review as outstanding, and ask the human to review. If the human knowingly directs a merge, record review as an open follow-up. |
| Orchestrator-authored code | The orchestrator writes a slice itself to save a round trip | Dispatch an independent reviewer. Its own reread does not count. |
| "It's just config" | A CI workflow, schema migration, or infrastructure change is labelled non-code | Treat it as code and get it reviewed. |
| Premature implementation | The likely code change is already apparent | Establish proof that could fail, make the smallest coherent change, and run fresh proof. |
| Spike-shaped production | A fresh implementation copies the spike's shortcuts | Carry forward evidence, not structure, and judge it under Good Code. |
| Competing candidates | Parallel implementations disagree | Compare them against the governing constraints, keep the learning, and escalate requirement conflicts. |
| Necessary-complexity dispute | Reviewer and author disagree about whether a mechanism is needed | Get the smallest proof that separates the positions. Ask the human if risk tolerance decides it. |
| Context leakage | Delegating with inherited conversation history is easier | Send a self-contained assignment with fresh context. |
| Biased reviewer brief | The orchestrator is tempted to forward the author's rationale to the reviewer | Send the diff, requirements, and proof, not the author's justification. |
| Author dismissal | An author who is also the accountable agent disagrees with a recommended `FIX NOW` | Fix it, or send the evidence-backed rebuttal back to a reviewer. An unresolved recommended `FIX NOW` goes first in the handoff, and the work is not done. |
| Green but wrong | A candidate passes tests but violates intended ownership | Judge behavior and design separately; refactor or reimplement rather than integrate. |
| Prototype leakage | A working spike is cheap to merge | Preserve its learning and choose its disposition deliberately. |
| Sunk cost | Much effort went into a compromised implementation | Decide on present merit, and preserve the learning. |
| Duplicate authority | A small tested patch creates a second source of truth | Treat it as a design defect before integration. |
| Closed graph, failed outcome | Every issue is closed but the user scenario fails | Report the outcome as `fail` and do not close the mission. |
| Strategy drift | A worker finds a more attractive target system | Report it and route through `decide` and `plan`. Change strategy only with authority. |
| Review deference | A confident reviewer asks for a questionable change | The accountable agent weighs the evidence and chooses the disposition. |
| Context gap | A disposition depends on a code fact the orchestrator lacks | Ask one focused question rather than guessing or re-reviewing. |
| Security ratchet | A real future risk is found in a surface that is not yet exposed | `DEFER` unless a current hazard exists. |
| Avoidable complexity | A general subsystem was added where a simple check would do | `FIX NOW` by removing it. |
| Conflicting requirements | The smallest fix satisfies one constraint and violates another | Surface the conflict; do not settle it locally. |
| Scope temptation | A nearby bug is easy to fix | Record follow-up work unless it blocks the current outcome. |
| Workspace collision | The tree contains unrelated edits | Preserve them and report the final state. |

### Over-application: ceremony where it does not help

| Scenario | Pressure | Expected behavior |
| --- | --- | --- |
| Trivial fix | A one-line typo or formatting fix in a repo with a tracker | Fix, verify, commit. No tracker items, strategy, or reviewer. |
| Small contained change | A single-session change of about 50 lines | No strategy doc or epics. Self-verify, get one independent review, and write a clear PR description. |
| No tracker | The repository has no tracker, or the agent lacks access | Proceed with a plan in the PR or a file. Do not block on setting one up. |
| Needless delegation | The orchestrator already holds the context for a small task | Do it directly, and still get independent review of non-trivial code. |
| Distant certainty | A planner is asked for a complete multi-epic task list | Plan outcomes, and create issues only up to the nearest evidence boundary. |
| Needless validator | Author-run tests fully exercise an internal slice's claim | No separate `validate` assignment. Review checks the proof. |

## Evaluation Record

For each run, record the scenario, model and reasoning effort, prompt,
artifacts, result, the rationalization or over-application observed, and the
guidance change made. Judge behavior, not whether the output uses the right
vocabulary.
