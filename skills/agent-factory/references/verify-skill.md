# Verify Skill

A repository's verify skill lets any agent prove that the app works, not only
that its tests pass. It is a skill in the repository (for example
`.agents/skills/verify/SKILL.md`) built on two things:

- **A control CLI** the agent drives the app with: commands that start it, act
  on it as a user would (open a page, send a request, tap a button) and read its
  state as text. Output an agent must interpret by eye, such as a screenshot,
  is a last resort.
- **A feature map:** each thing the app does, and the command or scenario that
  proves it works. A change names the features it touches, and its proof runs
  their entries.

Its sections:

- **Launch:** start the app from a clean checkout with its dependencies in one
  command, and how to tell it is ready.
- **Doctor:** check the environment first (tools, ports, credentials, devices)
  and say how to fix each failure, so a broken setup is not taken for a broken
  change.
- **Drive:** each control CLI command, with an example.
- **Evidence:** what to capture as proof (command output, screenshots,
  recordings) and where, so a reviewer can check it.
- **Cleanup:** stop what Launch started and remove what the run made.

Nobody relies on it until an agent has run it end to end from a clean checkout:
Doctor, Launch, Drive of one feature, Evidence and Cleanup.
