# Submodel Selection

Choose the cheapest model and reasoning effort that make the whole workflow
likely to succeed, counting retries, verification effort, elapsed time, and
the cost of accepting a mistake, not just the quality of one run.

## Tiers

Map the runtime's available models to three tiers:

| Tier | Typical use |
| --- | --- |
| Cheap | Reconnaissance, drafts, spikes, mechanical edits, test runs, and parallel experiments with a reliable automated check |
| Balanced | Integration-ready implementation, code review, diagnosis, and synthesis of evidence |
| Strong | Consequential decisions, hard multi-system reasoning, orchestration of large missions, and work whose mistakes are subtle, hard to detect, or costly to reverse |

## Guidance

- **Cheap verification justifies cheap attempts.** When tests or other checks
  will catch mistakes, start cheap and escalate after failures or inconclusive
  results. Labels such as "security" or "migration" do not by themselves rule
  out a cheap exploratory run.
- **Cheap output is not trusted output.** Apply review and proof in
  proportion to what depends on the result. Cheap exploration followed by
  balanced or strong integration and review is a common, effective pattern.
- **Escalate for synthesis, not for labels.** Move up when the difficulty is
  holding a long chain of reasoning together, not merely because a task is
  called review or implementation.
- **Reviewers benefit from diversity.** When a choice exists, reviewing with a
  different model from the author's reduces shared blind spots. It is useful
  but not required.
- **Start fresh.** Give subagents a self-contained prompt, not the parent's
  conversation, unless essential context cannot be summarized.

If the runtime cannot set the model or reasoning effort, use the defaults and
put the effort into a clear assignment.
