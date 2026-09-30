# Repository Shape

Use this reference when installing Agent Factory or assessing whether a
repository is easy for agents to work in. The goal is that a fresh agent can
find what it needs from durable, version-controlled sources. File names and
layout are the repository's choice.

## Readiness Test

A fresh agent should be able to answer these from the repository's entry
point (usually `AGENTS.md` or the README) and the sources it links to:

1. What is this product trying to achieve, and for whom?
2. What do its core terms mean?
3. Where is current work tracked, and what state is it in?
4. What behavior is public, and what constraints are architectural?
5. Why were important non-obvious choices made?
6. How is the code built and checked, and what standards apply?
7. Which state is durable, and which is generated or local and safe to
   rebuild?
8. Which tracker is used, and how does it represent missions, epics, and
   evidence?

A small repository may answer most of these in one README. A larger one will
split them up. Either is fine if the answers exist and can be found. A
missing answer is a readiness gap even if the code builds.

## Entry Point

Keep the root instruction file short. It is a map that points to one clear
home for each concern, plus any constraints an agent cannot safely infer. It
is not a command cookbook, and it should not duplicate the docs it links to.

The Agent Factory part of it, typically a short `## Agent Factory` section,
records only what a capable agent could not work out alone:

- the tracker and its location;
- how missions, epics, validation, and evidence are represented if the tracker
  does not model them directly;
- links to review, validation, workflow, and branch policy;
- unusual setup, permission, or recovery constraints.

Keep tracker configuration with its owner. For example, GitHub templates and
labels live under `.github/`, and branch policy lives in the contributing
docs. In a monorepo, add a nested instruction file only where a subtree
genuinely works differently.

## Common Homes

When a repository is large enough to split these concerns, typical homes are:

| Concern | Typical home |
| --- | --- |
| Product intent, users, non-goals | README or a product intent doc |
| Domain vocabulary | A glossary or context doc |
| Doc index: which doc owns what | `docs/index.md` or README |
| Product behavior and public contracts | `docs/product/` or equivalent |
| Architecture: boundaries, ownership, dependency direction | `docs/architecture/` or equivalent |
| Decisions and rationale | `docs/adr/` |
| Standards and how claims are checked | Contributing, quality, or testing docs |

Split a document when it starts serving conflicting audiences. Product docs
say what users can expect, architecture docs say how the system is
constrained, and vocabulary docs say what words mean. Cross-link them rather
than repeating one contract in all three.

## Decisions

Write an ADR when a decision is costly to reverse, non-obvious, likely to be
re-argued, crosses boundaries, changes a public or persisted contract, or
deliberately rejects a plausible alternative. A useful ADR has a stable
identifier, a status, the context and forces behind it, the decision, and its
consequences. When a decision changes, write a new ADR that supersedes the old
one rather than rewriting history.

## Docs as a Maintained System

Every durable doc should be reachable from the entry point or an index. When a
change alters behavior, architecture, vocabulary, durable state, or a
significant decision, update the affected docs in the same piece of work. Stale
guidance is worse than an acknowledged gap because it confidently misleads.

## Durable and Local State

Make the source of truth unambiguous. Anything that must survive a fresh clone
or a handoff lives in version control or the tracker. Caches, indexes,
generated output, and machine-local config should be identified as such,
ignored where appropriate, and rebuildable by a documented command. Private
machine state must never be the only record of scope, decisions, or proof.
