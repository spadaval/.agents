# Implementation Candidates

Use this reference when code is being written partly to learn, such as a
spike or competing implementations, or when you must decide whether working
code should be kept.

## Principle

Code is both a product and a source of evidence. A candidate can behave
correctly and still be built wrong, or be built wrong and still teach you
something essential. Judge three things separately:

1. **Behavior:** what it demonstrably does.
2. **Design:** whether it meets [Good Code](good-code.md) and fits the target
   system.
3. **Learning:** what building it established, disproved, or newly called
   into question.

## Choosing an Approach

- **Go direct** when the path is understood and another attempt would not
  change your decision.
- **Spike** when a cheap, disposable attempt can answer a real question about
  feasibility, behavior, performance, or integration. A spike is evidence, not
  production code. Contain its side effects.
- **Run parallel spikes** when several plausible approaches cannot be compared
  without building them. Give them the same requirements and proof, and keep
  them isolated from one another.
- **Reimplement** when a candidate taught you the right behavior through the
  wrong structure. Carry forward its tests and findings, not its code.

Do not manufacture alternatives that would not change the decision. Cheap
models suit spikes when attempts and checks are cheap.

## Assigning a Candidate

Add these to the assignment:

- **Purpose:** production candidate, spike (evidence only), or comparison
  candidate.
- **Question:** what building it should establish.
- **Visibility:** what the candidate may see of earlier or parallel attempts.
  A reimplementation usually gets their findings and tests but not their code.
  If independence matters, keep them isolated, and do not claim independence
  after the boundary has been crossed.

## Deciding What Happens to It

Choose one:

- **integrate:** behavior and design are both sound;
- **refactor:** the design is salvageable within the current work;
- **reimplement:** keep the learning and rebuild the construction;
- **retain:** keep it temporarily for comparison or follow-up;
- **discard:** keep the learning and drop the code;
- **blocked:** a requirement, authority, or strategy question must be settled
  first.

Passing tests never make integration the default. Effort already spent is not
a reason to keep code. If candidates expose conflicting requirements or a
strategic question, escalate it instead of picking a side locally. Choosing a
candidate does not replace review.

## Preserving What Was Learned

Before discarding or superseding a candidate that taught you something,
record in the tracker or the PR:

- the question and the result;
- constraints discovered and assumptions that failed;
- what was wrong with the construction, if anything;
- tests, fixtures, or measurements worth reusing;
- why the code was not kept.

Keep the learning, not the code. Do not retain rejected paths or duplicate
implementations for the sake of history.
