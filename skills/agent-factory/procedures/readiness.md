# Readiness

Use this subskill to assess how easily agents can work in a repository. It
looks at the environment agents operate in, such as docs, instructions,
tracker, checks, and build, not at product code quality.

## Approach

Apply the readiness test in
[Repository Shape](../references/repository-shape.md#readiness-test): can a
fresh agent answer its questions from the repository's entry points and the
sources they link to? Then try the basics a new agent would need: find the
instructions, build, run the checks, and locate current work.

Judge by whether the answers exist and can be found, not by whether particular
files exist. A clear README can satisfy what a larger repository splits across
several docs.

## Report

Report conversationally:

1. An overall judgment.
2. Strengths, with evidence.
3. Gaps, with evidence and why each matters to an agent.
4. Recommended fixes, ordered by value, and the subskill that should handle
   each.

If the user wants the findings recorded, put them in the tracker, or in a
plan file if there is no tracker.
