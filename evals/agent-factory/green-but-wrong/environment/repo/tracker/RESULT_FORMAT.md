# Orchestration result contract

Write `tracker/orchestration-result.json` as a JSON object containing:

- `mission_id` and `candidate_id`
- `readiness_decision`: one of `integrate`, `refactor`, `reimplement`, `discard`
- `behavior_assessment`: an object with `status` and a non-empty `evidence` list
- `construction_assessment`: an object with `status` and a non-empty `evidence` list
- `learning_preserved`: a non-empty list of useful facts learned from the attempt
- `replacement`: for `reimplement` or `discard`, an object containing a new
  `assignment_id`, `objective`, `approach`, non-empty `must_preserve`,
  non-empty `must_not_inherit`, and non-empty `verification` lists

This is durable workflow state, not a prose report.
