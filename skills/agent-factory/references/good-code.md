# Good Code

Use this reference when planning, producing, reviewing, or deciding the
disposition of implementation code. Repository architecture and standards
remain authoritative; this reference supplies the shared questions.

Good code does more than pass its tests. It:

- satisfies the current behavior and constraints;
- puts responsibility and state in the right owner;
- preserves clear boundaries and dependency direction;
- uses the fewest moving parts that keep the design coherent;
- makes important behavior and failure modes easy to verify;
- localizes likely change instead of duplicating knowledge; and
- leaves no obsolete paths, temporary shortcuts, or misleading residue.

Judge behavior, design, and operability separately. Working behavior makes a
candidate useful; sound design makes it fit to integrate. Operable code leaves
the next agent able to understand, test, change, and diagnose it safely.

For non-trivial production code, establish the intended owner, boundaries,
state authority, important invariants, and proof before or while implementing.
Use a spike when construction can cheaply answer an important unknown, but do
not let the spike's shape become the design by default. Preserve what it taught,
then refactor or reimplement deliberately.

Before integration, ask:

- Is responsibility in one clear owner, with one authority for each state?
- Do dependencies and knowledge cross only intended boundaries?
- Does every new moving part support a current claim or constraint?
- Is there a materially simpler design that does not move the complexity?
- Can important behavior be falsified at the boundary that owns it?
- Did the change remove its temporary code and obsolete paths?

These are judgment prompts, not a checklist for trivial changes. Style
preferences are not quality defects. A defect must identify a concrete
boundary, responsibility, unnecessary mechanism, verification problem, or
residue and explain its consequence.
