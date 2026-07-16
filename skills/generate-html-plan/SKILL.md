---
name: generate-html-plan
description: Run an exhaustive, code-aware planning interview and turn the resolved design into a validated interactive HTML plan. Use when Codex needs to plan a substantial feature, refactor, migration, or architecture change; challenge scope and domain language; resolve a design tree collaboratively; or replace a long Markdown implementation plan with a navigable Svelte/Vite plan app.
---

# Generate HTML Plan

Treat planning as a collaborative design investigation, not a prompt for an
immediate prose plan. Explore first, interview until the consequential design
tree is closed, then generate the plan as a typed Svelte/Vite app.

## Workflow

### 1. Establish the planning surface

- Inspect the repository, relevant code, tests, configuration, and existing
  plans before asking anything the code can answer.
- Find `AGENTS.md`, `CONTEXT.md`, `CONTEXT-MAP.md`, and applicable ADRs. Follow
  a context map to context-local documentation.
- State the planning topic, known constraints, and the first unresolved branch.
- Build a private coverage map. At minimum consider intent and success,
  current behavior, actors and scenarios, scope and non-goals, domain language
  and invariants, interfaces and data, permissions and security, failure and
  recovery behavior, compatibility and migration, observability and
  operations, delivery slices, testing, and rollout. Mark a branch
  inapplicable only for a concrete reason.

### 2. Interview to closure

- Walk dependency order: settle upstream product and domain decisions before
  downstream implementation choices.
- Ask related questions in repeated small batches, then wait indefinitely for
  the answer. When a structured question tool is available, use it without an
  automatic timeout. Use as many rounds as the design requires.
- For every consequential question provide:
  - distinct options and their material tradeoffs;
  - a recommendation and why it fits the observed system;
  - decision impact or implementation complexity (`S`, `M`, `L`, or `XL`);
  - a concrete scenario when that makes the distinction easier to evaluate.
- Do not silently fill a branch because the likely answer seems obvious. An
  explicit assumption is acceptable only when it is low-impact, reversible,
  and visibly recorded for the final plan.
- Reopen the coverage map when an answer reveals a new dependency. Do not ask
  whether the user wants more questions while consequential branches remain.
- Challenge conflicting glossary terms, fuzzy nouns, and claims that disagree
  with code. Prefer a precise canonical term and stress-test boundaries with
  examples.
- Keep a decision ledger in the conversation: resolved choice, rationale,
  rejected alternatives, assumptions, evidence, deferred items, and affected
  areas. Do not emit a long Markdown plan as a substitute for the HTML output.

### 3. Respect Plan mode's write boundary

When Codex is in Plan mode, perform all exploration and interviewing read-only.
Do not scaffold the app or update domain documentation.

After all applicable branches are resolved:

1. Give a compact closure audit: resolved decision areas, explicit
   assumptions, intentionally deferred items, and documentation changes that
   will be made. This is a handoff summary, not the implementation plan.
2. Ask the user: **“Please disable Plan mode, then reply ‘Generate the HTML
   plan’.”**
3. Wait for both the mode change and explicit go-ahead. If editing remains
   disabled, explain that the plan cannot be generated yet and repeat the
   request. Never claim the HTML plan exists before the files validate.

Outside Plan mode, still complete the interview before writing, then proceed
directly to generation after the closure audit. Do not ask for permission or a
second go-ahead: invoking this skill already authorizes plan generation once
the interview is complete.

### 4. Generate the plan workspace

After the Plan-mode handoff and explicit go-ahead, or immediately after closure
outside Plan mode, choose a new descriptive artifact ID. Artifact Hub writes
the plan under `~/.agents/artifacts/<id>/`; never overwrite an existing
artifact.

Run:

```bash
node <skill-dir>/scripts/create-plan-app.mjs <artifact-id> --title <title> --repository <repository>
```

Author `~/.agents/artifacts/<artifact-id>/src/plan/plan.ts` from the decision ledger and codebase
evidence. Use the exported types; do not replace the typed model with raw HTML
or an unvalidated JSON blob.

The generated plan must:

- lead with outcome, scope, non-goals, constraints, and success signals;
- expose decisions with rationale, alternatives, impact, confidence, and
  source paths where useful;
- show system relationships and execution phases in dependency order;
- give each phase concrete changes, affected files or areas, dependencies,
  verification, and completion signals;
- include realistic scenarios, risks with mitigations and triggers, explicit
  assumptions, and intentionally deferred work;
- distinguish product decisions from implementation mechanics;
- contain no unresolved consequential question disguised as a step;
- stay concise enough to scan. Put detail in expandable disclosures instead of
  repeating it across sections.

The viewer provides hierarchy, semantic color, filters, collapsible detail,
and locally persisted review state. Preserve those shared behaviors. Change
the template only for reusable platform improvements; keep plan-specific
content in `src/plan/plan.ts`.

### 5. Write domain documentation after the handoff

Apply resolved domain-language updates only after editing is enabled. Read
[references/context-format.md](references/context-format.md) before creating or
updating `CONTEXT.md` or `CONTEXT-MAP.md`.

Offer an ADR only when the decision is hard to reverse, surprising without its
context, and the result of a real tradeoff. Read
[references/adr-format.md](references/adr-format.md) before writing one. List
documentation changes in the HTML plan whether they are applied now or assigned
to an execution phase.

### 6. Validate and inspect

Run:

```bash
cd ~/.agents/artifacts/<artifact-id>
/root/.agents/node_modules/.bin/vite-node scripts/validate-plan.ts
/root/.agents/node_modules/.bin/vitest run --config /root/.agents/vitest.config.ts --root .
/root/.agents/node_modules/.bin/svelte-check --tsconfig ./tsconfig.json
/root/.agents/bin/artifact-hub open <artifact-id>
```

Inspect the live plan at desktop and narrow widths. Confirm navigation,
filters, disclosures, dependency links, and review-state controls work; confirm
the essential plan remains understandable without expanding every card. The
shared Hub service owns network binding; do not start a plan-local server.

Return the artifact path, viewer URL, validation results, and a short list of
domain-documentation files changed. The HTML app is the canonical plan; the
final chat response is only a concise handoff.

## Workspace contract

```text
~/.agents/artifacts/<artifact-id>/
├── manifest.json            # Artifact Hub catalog metadata
├── index.html               # artifact-relative Vite entry
├── src/lib/                 # plan-local typed model and validation
├── src/plan/plan.ts         # plan-local authored content
└── ...                      # complete custom Svelte application
```

The artifact owns its complete Svelte pages but shares Artifact Hub's single
Vite process and dependency installation. Do not add a second full Markdown
plan or duplicate the app's content into auxiliary documentation.
