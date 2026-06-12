# Validate

Use this subskill for validation items, assigned validation scenarios, and
scenario-centered closeout checks. Validation starts from the intended behavior,
not from the diff.

## Start Gate

Follow [repository workflow](../standards/repo-workflow.md) for git worktree
checks, and [tracker.md](../standards/tracker.md) plus `AGENTFACTORY.md` for
tracker mechanics and sync/check commands. Then inspect the validation item and
parent mission or epic:

```bash
atelier issue show <validation-or-closeout-id>
atelier mission show <mission-id>
atelier mission status <mission-id>
atelier issue show <parent-epic-id>
```

Read only the docs and tracker items needed to understand the assigned scenario,
expected behavior, test data, environment, and known breakage. Do not reshape
the epic or reschedule validation unless explicitly assigned planning work.
List the Outcome lines you are validating before choosing commands so the
handoff can show how each claim was proved or classified.

## Validation Stance

Be adversarial about behavior:

- Start from the product or operator claim, not the implementation plan.
- Verify every relevant Outcome line by line.
- Try to disprove that the scenario works.
- Prefer observable behavior over internal assumptions.
- Keep the pass/fail path reproducible.
- Capture command transcripts or bounded manual/browser evidence for every
  claim that passes, fails, or blocks.
- Inspect ignored, skipped, or stale tests when test freshness is part of the
  claim or when passing tests are used as proof.
- Check docs/help consistency when public commands, documented workflows, or
  Agent Factory guidance are part of the claim.
- Do not fix defects unless the tracker item explicitly assigns implementation
  work.
- File or recommend follow-up items for real discovered work.

## Choose The Proof

Use the proof method named by the tracker item. If the item leaves it open, choose the
smallest proof that genuinely exercises the scenario:

- **Integration test**: deterministic cross-package, persistence, lifecycle,
  migration, or workflow behavior.
- **Browser or Playwright validation**: UI state, navigation, interaction,
  failure rendering, empty states, or responsive behavior.
- **Scripted validation**: repeatable service, container, CLI, or operator flow.
- **One-off walkthrough**: exploratory, credential-dependent, provider-dependent,
  expensive, or not-yet-stable behavior.
- **Static/refactor proof**: public behavior is preserved; combine
  targeted tests, type/build checks, residue searches, and representative
  scenario proof where risk warrants it.

For browser-visible behavior, assert on DOM and state. Cover desktop and
mobile when responsive behavior matters.

## Evidence

Record concise evidence as first-class Atelier evidence when available, then
attach it to the issue, mission, or other target it proves:

```bash
atelier evidence add --kind <kind> --result <pass|fail|blocked|deferred|not-applicable> "summary"
atelier evidence attach <evidence-id> issue <validation-or-closeout-id>
```

For trivial documentation-only proof, a durable tracker note can be enough only
when the assigned Evidence does not require first-class evidence. Risky, broad,
public-contract, process-policy, parent-level, epic, mission, docs/help parity,
stale-test, and migration claims need first-class evidence. Whether using
first-class evidence or notes, include:

- scenario name or criterion;
- each Outcome line verified and its classification;
- proof method;
- commands or manual/browser steps;
- observed result;
- result state: `pass`, `fail`, `blocked`, `deferred`, or `not-applicable`;
- failure classification and first concrete failure, when relevant;
- artifact paths, screenshots, run IDs, or logs only when useful and bounded;
- follow-up tracker item IDs.

Run raw workflow validators only when the binding, assignment, or closeout
contract requires an advanced policy check. Record the validator result as a
policy signal, not as a replacement for line-by-line Outcome proof.

Do not paste raw prompts, generated source, full diffs, huge logs, raw stdout or
stderr dumps, or secrets.

## Failure Handling

Classify every non-pass:

- in-scope defect;
- intentional migration breakage owned by a named tracker item;
- environment or tooling failure;
- unrelated pre-existing failure;
- deferred validation with a named owner;
- not applicable because scope changed.

If validation is blocked, record the missing precondition and exact command or
step that hit it. If behavior fails, state the user/operator-visible failure and
recommend the next tracker item shape rather than silently broadening scope.

## Handoff

Before closing a validation item, confirm every relevant Outcome and Evidence
line is satisfied or explicitly classified, attach the proof, and run any
required advanced policy check. Follow
[repository workflow](../standards/repo-workflow.md) for the handoff git check,
and [tracker.md](../standards/tracker.md) for syncing or exporting tracker
state.

Handoff names the scenario result, line-by-line classifications, evidence,
checks or steps run, ignored-test review, docs/help consistency result,
failures, follow-up items, and deferred validation.
