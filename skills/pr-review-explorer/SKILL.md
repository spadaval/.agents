---
name: pr-review-explorer
description: Create evidence-backed, diff-first Svelte/Vite review apps for GitHub pull requests. Use when Codex needs to make a large PR easier to review, group changes into semantic layers, provide a sidebar/file navigator, or expose complete per-file diffs outside GitHub's flat file viewer.
---

# PR Review Explorer

Use the repository and GitHub facts, not a hand-copied diff. Keep immutable
extracted data separate from agent-authored review semantics.

## Workflow

1. Extract a new workspace. For a checked-out PR, run:

   ```bash
   node <skill-dir>/scripts/extract-pr.mjs --repo . --pr <number> --output-dir <workspace>
   node <skill-dir>/scripts/create-review-app.mjs <workspace>
   ```

   The extractor uses `gh` for PR metadata and Git for the exact
   `base...head` patch. It writes `evidence/pr.json` and `markdown/index.md`.
   Read the Markdown brief and relevant diff entries directly; the UI is for
   human exploration, not the primary analysis surface.

2. Author `app/src/report/review.ts`. Define concise semantic layers using
   actual path lists, explain their purpose and review focus, and keep file
   ownership unambiguous. Do not infer layers from alphabetical order or leave
   significant files unassigned. Add explicit `starredFiles` for the small set
   of files a reviewer should inspect first; include a title and evidence-based
   reason. The UI pins these files above normal files and supports a
   “Priority files only” mode. Add optional line-level `highlights` only when a
   specific diff line establishes an important behavior or risk; every highlight
   needs a concrete review question. Do not infer file importance from a line
   highlight or from file names, change count, or keywords.

3. Validate and inspect the viewer:

   ```bash
   cd <workspace>/app
   npm install
   npm run validate-review
   npm test
   npm run check
   node <skill-dir>/scripts/review-viewer.mjs start .
   ```

   The viewer binds only to `127.0.0.1`. Inspect both desktop and narrow
   widths. Each file view must show the actual extracted diff, not an agent
   summary in place of evidence.

## Workspace contract

```text
workspace/
├── evidence/pr.json       # helper-owned PR metadata, stats, and per-file diffs
├── markdown/index.md      # helper-owned readable brief
├── manifest.json
└── app/
    ├── public/data/pr.json # copied immutable evidence
    └── src/report/review.ts # agent-authored layers and review guidance
```

Treat the evidence pack as immutable. The authored data explains why files
matter; the UI joins it to exact diff content. Report missing Git objects,
GitHub authentication, and invalid review paths with the concrete command,
identifier, and reason.
