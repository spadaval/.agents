# Good Code

Use this reference when planning, writing, or reviewing non-trivial code.
The repository's own architecture and standards take precedence; this page
supplies the shared questions.

Good code does more than pass its tests. It:

- meets the current requirements and constraints;
- puts each responsibility and each piece of state in one clear owner;
- respects boundaries and dependency direction;
- uses the fewest moving parts that keep the design coherent;
- makes important behavior and failure modes easy to verify, and reports
  failures with the failed operation, the relevant identifier, and an
  actionable reason;
- keeps likely changes local instead of duplicating knowledge; and
- leaves no obsolete paths, temporary shortcuts, or misleading residue.

Behavior, design, and operability are separate judgments. Working behavior
makes code useful. Sound design makes it fit to integrate. Operability means
the next agent can understand, test, change, and diagnose it safely.

For non-trivial work, know the intended owner, boundaries, source of truth for
state, key invariants, and proof before or while you build. A spike is a
cheap way to answer an unknown, but do not let its shape become the design by
default. Keep what it taught you and build the real thing deliberately.

Before integrating, ask:

- Does each responsibility have one owner, and each piece of state one
  authority?
- Do dependencies cross only intended boundaries?
- Does every new moving part serve a current requirement?
- Is there a materially simpler design that does not just move the
  complexity?
- Can the important behavior be tested at the boundary that owns it?
- Is temporary code and every obsolete path gone?

These are prompts for judgment, not a checklist for trivial changes. A
quality defect names a concrete boundary, responsibility, unnecessary
mechanism, verification gap, or piece of residue and explains its
consequence. Style preferences are not defects.
